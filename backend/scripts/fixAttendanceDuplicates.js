/**
 * Makes "one attendance record per user per day" a database guarantee.
 *
 * Until now it was only a controller check -- a findOne followed by a create,
 * with no transaction between them -- so a retried punch could write two rows
 * for the same day. models/Attendance.js now declares the index as unique, but
 * Mongoose CANNOT convert an existing non-unique index in place: it raises
 * IndexOptionsConflict, logs it, and carries on with the collection still
 * unprotected. This script does the drop-and-recreate that autoIndex can't.
 *
 * Order matters. A unique index cannot be built over a collection that already
 * contains duplicates, so they are found (and optionally merged) first.
 *
 *   node scripts/fixAttendanceDuplicates.js            # report only
 *   node scripts/fixAttendanceDuplicates.js --apply    # rebuild the index
 *   node scripts/fixAttendanceDuplicates.js --apply --merge
 *
 * --merge is required only if duplicates are found. It keeps ONE row per
 * user/day and deletes the rest, writing every deleted document to
 * backups/ first. Attendance is payroll evidence; nothing is removed without
 * a copy on disk.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const MERGE = process.argv.includes("--merge");

const INDEX_NAME = "userId_1_date_1";
const BACKUP_DIR = path.join(__dirname, "..", "backups");

const line = () => console.log("=".repeat(62));

/**
 * Which of a duplicate set to keep.
 *
 * A completed day beats an incomplete one -- a row with a punch-out holds
 * working hours that a bare punch-in does not, and losing it would understate
 * someone's pay. Ties go to the earliest punch-in, which is the real start of
 * the day. A row carrying a selfie beats one without, since that is the
 * evidence behind the record.
 */
const score = (row) => {
    let n = 0;
    if (row.punchOutTime) n += 4;
    if (row.punchInPhoto) n += 2;
    if (row.punchOutPhoto) n += 1;
    return n;
};

const pickKeeper = (rows) =>
    [...rows].sort((a, b) => {
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;

        const at = a.punchInTime ? new Date(a.punchInTime).getTime() : Infinity;
        const bt = b.punchInTime ? new Date(b.punchInTime).getTime() : Infinity;
        return at - bt;
    })[0];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;
    const col = db.collection("attendances");
    const host = (process.env.MONGO_URI.match(/@([^/?]+)/) || [])[1] || "local";

    line();
    console.log(`database : ${db.databaseName} @ ${host}`);
    console.log(`mode     : ${APPLY ? "APPLY" : "REPORT ONLY (nothing written)"}`);
    line();

    // --- 1. duplicates -----------------------------------------------------
    const groups = await col
        .aggregate([
            { $group: { _id: { userId: "$userId", date: "$date" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { n: { $gt: 1 } } },
            { $sort: { n: -1 } },
        ])
        .toArray();

    const total = await col.countDocuments();
    console.log(`\n1. Attendance rows: ${total}`);
    console.log(`   duplicate (user, date) groups: ${groups.length}`);

    for (const g of groups.slice(0, 20)) {
        console.log(`     user ${String(g._id.userId)}  ${g._id.date}  -> ${g.n} rows`);
    }
    if (groups.length > 20) console.log(`     ... and ${groups.length - 20} more`);

    if (groups.length > 0) {
        if (!MERGE) {
            console.log(
                "\n   Duplicates present. A unique index cannot be built over them.\n" +
                "   Re-run with --apply --merge to keep one row per user/day\n" +
                "   (completed days and rows carrying a selfie win; a backup is written first)."
            );
            await mongoose.disconnect();
            process.exit(1);
        }

        const doomed = [];
        for (const g of groups) {
            const rows = await col.find({ _id: { $in: g.ids } }).toArray();
            const keeper = pickKeeper(rows);
            for (const r of rows) {
                if (String(r._id) !== String(keeper._id)) doomed.push(r);
            }
        }

        console.log(`\n   rows to remove: ${doomed.length}`);

        if (APPLY) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            const file = path.join(BACKUP_DIR, `attendance-duplicates-${Date.now()}.json`);
            fs.writeFileSync(file, JSON.stringify(doomed, null, 2));
            console.log(`   backup written: ${file}`);

            const res = await col.deleteMany({ _id: { $in: doomed.map((d) => d._id) } });
            console.log(`   deleted: ${res.deletedCount}`);
        } else {
            console.log("   (report only -- nothing deleted)");
        }
    }

    // --- 2. the index ------------------------------------------------------
    const indexes = await col.indexes();
    const existing = indexes.find((i) => i.name === INDEX_NAME);

    console.log(`\n2. Index ${INDEX_NAME}`);
    console.log(`   present: ${existing ? "yes" : "no"}   unique: ${existing?.unique ? "yes" : "no"}`);

    if (existing?.unique) {
        console.log("   -> already unique, nothing to do");
    } else if (!APPLY) {
        console.log("   -> would drop and recreate as unique (report only)");
    } else {
        if (existing) {
            await col.dropIndex(INDEX_NAME);
            console.log("   -> dropped the non-unique index");
        }
        await col.createIndex({ userId: 1, date: 1 }, { unique: true, name: INDEX_NAME });
        console.log("   -> created as UNIQUE");
    }

    // --- 3. verify ---------------------------------------------------------
    const after = (await col.indexes()).find((i) => i.name === INDEX_NAME);
    line();
    console.log(`unique guarantee: ${after?.unique ? "ACTIVE" : "NOT active"}`);
    if (!APPLY) console.log("Report only -- re-run with --apply to change anything.");
    line();

    await mongoose.disconnect();
}

// Guarded: requiring this file must never run it.
if (require.main === module) {
    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { pickKeeper, score };
