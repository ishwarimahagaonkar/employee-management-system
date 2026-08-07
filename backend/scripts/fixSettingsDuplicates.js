/**
 * Makes "one settings document per company" a database guarantee.
 *
 * getOrgSettings() used to be a findOne followed by a create, and it runs on
 * every punch -- so two employees punching in at a company whose settings row
 * did not exist yet could each create one. Nothing failed loudly. Every later
 * read just returned an arbitrary one of the two, so an admin changing the
 * geofence or the late cut-off saw it take effect only some of the time.
 *
 * The controllers now upsert atomically. This adds the unique index that makes
 * that guarantee real, and merges any duplicates already created.
 *
 *   node scripts/fixSettingsDuplicates.js            # report only
 *   node scripts/fixSettingsDuplicates.js --apply    # create the index
 *   node scripts/fixSettingsDuplicates.js --apply --merge
 *
 * Unlike the attendance fix there is no existing index to drop -- the settings
 * collection has none at all -- so this only ever adds one.
 *
 * --merge is needed only if duplicates exist. Settings hold the geofence,
 * working hours and leave allotment, so the surviving row is the one an admin
 * most recently touched, and every discarded document is written to backups/
 * first.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const MERGE = process.argv.includes("--merge");

const INDEX_NAME = "companyId_1";
const BACKUP_DIR = path.join(__dirname, "..", "backups");

const line = () => console.log("=".repeat(62));

/**
 * Which of a duplicate set to keep: the one edited most recently.
 *
 * An untouched duplicate holds nothing but schema defaults, while the one an
 * admin actually saved carries the real geofence and working hours. Keeping
 * the newest updatedAt preserves the configuration someone deliberately set.
 */
const pickKeeper = (rows) =>
    [...rows].sort((a, b) => {
        const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (bt !== at) return bt - at;
        // Same timestamp: prefer whichever was created first, for determinism.
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
    })[0];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;
    const col = db.collection("settings");
    const host = (process.env.MONGO_URI.match(/@([^/?]+)/) || [])[1] || "local";

    line();
    console.log(`database : ${db.databaseName} @ ${host}`);
    console.log(`mode     : ${APPLY ? "APPLY" : "REPORT ONLY (nothing written)"}`);
    line();

    // --- 1. duplicates -----------------------------------------------------
    const groups = await col
        .aggregate([
            { $group: { _id: "$companyId", n: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { n: { $gt: 1 } } },
        ])
        .toArray();

    console.log(`\n1. Settings documents: ${await col.countDocuments()}`);
    console.log(`   companies with more than one: ${groups.length}`);

    for (const g of groups) {
        console.log(`     companyId ${String(g._id)} -> ${g.n} documents`);
    }

    if (groups.length > 0) {
        if (!MERGE) {
            console.log(
                "\n   Duplicates present. A unique index cannot be built over them.\n" +
                "   Re-run with --apply --merge to keep the most recently updated\n" +
                "   document per company (a backup is written first)."
            );
            await mongoose.disconnect();
            process.exit(1);
        }

        const doomed = [];
        for (const g of groups) {
            const rows = await col.find({ _id: { $in: g.ids } }).toArray();
            const keeper = pickKeeper(rows);
            console.log(`     keeping ${String(keeper._id)} (updated ${keeper.updatedAt || "never"})`);
            for (const r of rows) {
                if (String(r._id) !== String(keeper._id)) doomed.push(r);
            }
        }

        console.log(`\n   documents to remove: ${doomed.length}`);

        if (APPLY) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            const file = path.join(BACKUP_DIR, `settings-duplicates-${Date.now()}.json`);
            fs.writeFileSync(file, JSON.stringify(doomed, null, 2));
            console.log(`   backup written: ${file}`);

            const res = await col.deleteMany({ _id: { $in: doomed.map((d) => d._id) } });
            console.log(`   deleted: ${res.deletedCount}`);
        } else {
            console.log("   (report only -- nothing deleted)");
        }
    }

    // --- 2. the index ------------------------------------------------------
    const existing = (await col.indexes()).find((i) => i.name === INDEX_NAME);

    console.log(`\n2. Index ${INDEX_NAME}`);
    console.log(`   present: ${existing ? "yes" : "no"}   unique: ${existing?.unique ? "yes" : "no"}`);

    if (existing?.unique) {
        console.log("   -> already unique, nothing to do");
    } else if (!APPLY) {
        console.log("   -> would create it as unique (report only)");
    } else {
        // A non-unique companyId_1 has never existed here, but drop it if some
        // deployment has one -- createIndex would raise IndexOptionsConflict.
        if (existing) {
            await col.dropIndex(INDEX_NAME);
            console.log("   -> dropped the non-unique index");
        }
        await col.createIndex({ companyId: 1 }, { unique: true, name: INDEX_NAME });
        console.log("   -> created as UNIQUE");
    }

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

module.exports = { pickKeeper };
