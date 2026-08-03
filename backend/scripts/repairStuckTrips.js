// Repairs trips left permanently open by the midnight-rollover bug.
//
// THE DAMAGE
// endTrip used to look the trip up by TODAY's date, but a trip is stored under
// the date it STARTED. A trip begun at 23:30 and ended at 00:15 searched the
// wrong document, was told "No active trip found", and stayed open forever.
// Its owner is then blocked from starting any new trip.
//
// WHAT THIS CAN HONESTLY REPAIR
// A stuck trip has startTime, startLocation and purpose. It has NO endLocation
// and NO route -- both are only written when a trip ends. There is therefore
// nothing from which a distance could be derived.
//
// So this script does NOT invent kilometres. It closes the trip and marks it
// distanceSource:"unrecorded" with distanceKm 0, which means "unknown", not
// "travelled nothing". Anyone owed reimbursement for these journeys must be
// handled by hand -- the report below is what you hand to whoever does that.
//
// SAFETY
//   - dry run by default; pass --apply to write
//   - writes a full JSON backup of every affected document before touching it
//   - only trips on documents dated BEFORE today, so a trip legitimately in
//     progress right now is never closed
//   - idempotent: an already-repaired trip is skipped
//
// Usage:
//   node scripts/repairStuckTrips.js            # report only
//   node scripts/repairStuckTrips.js --apply    # repair
//   node scripts/repairStuckTrips.js --apply --min-age-hours=6

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Travel = require("../src/models/Travel");
const User = require("../src/models/User");

const APPLY = process.argv.includes("--apply");

// A trip must be at least this old before we call it abandoned. Guards against
// closing something a user is genuinely still on.
const minAgeArg = process.argv.find((a) => a.startsWith("--min-age-hours="));
const MIN_AGE_HOURS = minAgeArg ? Number(minAgeArg.split("=")[1]) : 12;

const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const fmt = (d) =>
    d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }) : "-";

async function run() {
    if (!Number.isFinite(MIN_AGE_HOURS) || MIN_AGE_HOURS < 0) {
        console.error("--min-age-hours must be a non-negative number");
        process.exit(1);
    }

    await connectDB();

    const today = todayIST();
    const cutoff = Date.now() - MIN_AGE_HOURS * 3600 * 1000;

    console.log(APPLY ? "REPAIR MODE -- changes will be written\n" : "DRY RUN -- nothing will be written\n");
    console.log(`Today (IST): ${today}`);
    console.log(`Closing trips older than ${MIN_AGE_HOURS}h that started before today\n`);

    // Documents holding at least one unfinished trip.
    const docs = await Travel.find({ "trips.endTime": null }).sort({ date: 1 });

    const affected = [];
    const skipped = [];

    for (const doc of docs) {
        for (const trip of doc.trips) {
            if (trip.endTime) continue;

            // Already repaired by an earlier run.
            if (trip.distanceSource === "unrecorded") continue;

            // Never touch a trip belonging to today -- it may be live.
            if (doc.date >= today) {
                skipped.push({ doc, trip, why: "today's trip, may be in progress" });
                continue;
            }

            const started = trip.startTime ? new Date(trip.startTime).getTime() : null;

            if (started && started > cutoff) {
                skipped.push({ doc, trip, why: `started under ${MIN_AGE_HOURS}h ago` });
                continue;
            }

            affected.push({ doc, trip });
        }
    }

    // --- Report ----------------------------------------------------------
    if (affected.length === 0) {
        console.log("No stuck trips found.");
        if (skipped.length) {
            console.log(`\n${skipped.length} open trip(s) deliberately left alone:`);
            skipped.forEach(({ doc, trip, why }) =>
                console.log(`  ${doc.date}  ${fmt(trip.startTime)}  ${why}`)
            );
        }
        await mongoose.disconnect();
        process.exit(0);
    }

    // Names make the hand-off list usable by whoever settles reimbursement.
    const userIds = [...new Set(affected.map((a) => String(a.doc.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select("empID fullName email");
    const byId = new Map(users.map((u) => [String(u._id), u]));

    console.log(`${affected.length} stuck trip(s) across ${userIds.length} user(s):\n`);

    for (const { doc, trip } of affected) {
        const u = byId.get(String(doc.userId));
        const ageH = trip.startTime
            ? ((Date.now() - new Date(trip.startTime).getTime()) / 3600000).toFixed(1)
            : "?";

        console.log(`  ${doc.date}  ${u ? `${u.empID} ${u.fullName}` : doc.userId}`);
        console.log(`     purpose : ${trip.purpose || "(none)"}`);
        console.log(`     started : ${fmt(trip.startTime)}  (${ageH}h ago)`);
        console.log(`     from    : ${trip.startLocation?.address || `${trip.startLocation?.lat}, ${trip.startLocation?.lng}`}`);
        console.log(`     -> closing with distance UNKNOWN (no end location was ever recorded)\n`);
    }

    if (!APPLY) {
        console.log("=".repeat(64));
        console.log("Dry run. Re-run with --apply to repair.\n");
        console.log("These journeys have no recorded distance and will read as 0 km.");
        console.log("If any are reimbursable, settle them manually using the list above.");
        await mongoose.disconnect();
        process.exit(0);
    }

    // --- Backup before writing -------------------------------------------
    const backupDir = path.join(__dirname, "..", "..", "backups");
    fs.mkdirSync(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `stuck-trips-${Date.now()}.json`);
    const uniqueDocs = [...new Map(affected.map(({ doc }) => [String(doc._id), doc])).values()];

    fs.writeFileSync(
        backupPath,
        JSON.stringify(
            {
                takenAt: new Date().toISOString(),
                reason: "pre-repair snapshot (repairStuckTrips.js)",
                documents: uniqueDocs.map((d) => d.toObject()),
            },
            null,
            2
        )
    );

    console.log(`Backup written: ${backupPath}\n`);

    // --- Repair -----------------------------------------------------------
    let closed = 0;

    for (const doc of uniqueDocs) {
        for (const trip of doc.trips) {
            const isTarget = affected.some(
                (a) => String(a.doc._id) === String(doc._id) && String(a.trip._id) === String(trip._id)
            );
            if (!isTarget) continue;

            // endTime === startTime gives a zero duration on purpose: we do not
            // know when the trip finished, and inventing one would put a
            // fabricated number into payroll-adjacent data.
            trip.endTime = trip.startTime;
            trip.endLocation = undefined;
            trip.distanceKm = 0;
            trip.distanceSource = "unrecorded";
            trip.durationMin = 0;

            closed++;
        }

        doc.totalTrips = doc.trips.length;
        doc.totalDistanceKm = Number(
            doc.trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0).toFixed(2)
        );

        await doc.save();
    }

    console.log("=".repeat(64));
    console.log(`Closed ${closed} stuck trip(s) across ${uniqueDocs.length} document(s).`);
    console.log("\nThose users can start new trips again.");
    console.log("Their distances read 0 km and are marked 'unrecorded' -- settle any");
    console.log("reimbursement for them by hand using the list above.");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
