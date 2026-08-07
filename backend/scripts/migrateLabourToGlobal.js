// Migration for Feature 12: Labour becomes a company-wide master list.
//
// Before: every Labour document carried a required siteId, so the same person
// working two sites needed two records (which the unique mobile/labourId
// indexes actually made impossible).
// After:  Labour has no site at all. The site a labourer worked on a given day
//         lives only on that day's LabourAttendance row.
//
// What this does:
//   1. $unset siteId from every Labour document
//   2. Drop the now-meaningless {companyId, siteId, status} index
//   3. Mark every EXISTING attendance row as marked:true -- each one was
//      written by a supervisor explicitly saving the sheet under the old
//      model, so "already decided" is the truthful value. New rows created by
//      rostering start marked:false.
//
// Safe to run more than once: every step is a no-op when already applied.
// Run with --dry to see what would change without writing anything.
//
// Usage: node scripts/migrateLabourToGlobal.js [--dry]

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");

const DRY = process.argv.includes("--dry");

async function run() {
    await connectDB();
    const db = mongoose.connection.db;

    console.log(DRY ? "DRY RUN -- nothing will be written\n" : "Applying migration\n");

    // --- 1. Labour.siteId -------------------------------------------------
    const labour = db.collection("labour");
    const withSite = await labour.countDocuments({ siteId: { $exists: true } });

    console.log(`1. Labour documents still carrying siteId: ${withSite}`);

    if (withSite > 0) {
        // Reported before removal so the old assignment is recoverable from
        // this log if anyone needs to see what it was.
        const sample = await labour
            .find({ siteId: { $exists: true } })
            .project({ labourId: 1, fullName: 1, siteId: 1 })
            .toArray();

        sample.forEach((l) =>
            console.log(`     ${l.labourId} | ${l.fullName} | was site ${l.siteId}`)
        );

        if (!DRY) {
            const res = await labour.updateMany({}, { $unset: { siteId: "" } });
            console.log(`   -> siteId removed from ${res.modifiedCount} document(s)`);
        }
    } else {
        console.log("   -> nothing to do");
    }

    // --- 2. Stale index ---------------------------------------------------
    const indexes = await labour.indexes();
    const stale = indexes.find((i) => i.name === "companyId_1_siteId_1_status_1");

    console.log(`\n2. Stale index companyId_1_siteId_1_status_1: ${stale ? "present" : "absent"}`);

    if (stale && !DRY) {
        await labour.dropIndex("companyId_1_siteId_1_status_1");
        console.log("   -> dropped");
    } else if (!stale) {
        console.log("   -> nothing to do");
    }

    // --- 3. Backfill `marked` --------------------------------------------
    const attendance = db.collection("labourattendances");
    const unmarked = await attendance.countDocuments({ marked: { $exists: false } });

    console.log(`\n3. Attendance rows without a marked flag: ${unmarked}`);

    if (unmarked > 0 && !DRY) {
        const res = await attendance.updateMany(
            { marked: { $exists: false } },
            { $set: { marked: true } }
        );
        console.log(`   -> ${res.modifiedCount} row(s) set to marked:true (they were saved deliberately)`);
    } else if (unmarked === 0) {
        console.log("   -> nothing to do");
    }

    // --- Summary ----------------------------------------------------------
    console.log("\n" + "=".repeat(60));
    const totals = {
        labour: await labour.countDocuments(),
        labourStillWithSite: await labour.countDocuments({ siteId: { $exists: true } }),
        attendance: await attendance.countDocuments(),
        attendanceUnmarked: await attendance.countDocuments({ marked: { $exists: false } }),
    };
    console.log(`labour documents:            ${totals.labour}`);
    console.log(`  still carrying siteId:     ${totals.labourStillWithSite}${DRY ? " (dry run)" : ""}`);
    console.log(`attendance rows:             ${totals.attendance}`);
    console.log(`  missing marked flag:       ${totals.attendanceUnmarked}${DRY ? " (dry run)" : ""}`);

    if (!DRY && totals.labourStillWithSite === 0 && totals.attendanceUnmarked === 0) {
        console.log("\nMigration complete.");
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
