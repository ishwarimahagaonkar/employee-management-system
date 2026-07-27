// One-off migration: move empID from a GLOBAL unique index to a per-company
// unique index, so different companies can reuse ids like "EMP001".
//
// Steps:
//   1. Drop the old global `empID_1` unique index if present.
//   2. Detect any (companyId, empID) duplicates (e.g. legacy null-company rows).
//   3. If clean, build the compound unique index {companyId, empID}.
//      If duplicates exist, report them and skip -- resolve them, then re-run.
//
// Usage: node scripts/fixUserIndexes.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
    await connectDB();
    const coll = User.collection;

    // 1. Drop the old global empID index.
    const indexes = await coll.indexes();
    if (indexes.find((i) => i.name === "empID_1")) {
        await coll.dropIndex("empID_1");
        console.log("Dropped global index empID_1");
    } else {
        console.log("No global empID_1 index (already migrated?)");
    }

    // 2. Find (companyId, empID) duplicates.
    const dups = await coll.aggregate([
        { $group: { _id: { companyId: "$companyId", empID: "$empID" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();

    if (dups.length > 0) {
        console.warn(`\nFound ${dups.length} (companyId, empID) duplicate group(s). Compound unique index NOT built.`);
        dups.forEach((d) => {
            console.warn(`  companyId=${d._id.companyId} empID=${d._id.empID} -> ${d.count} users: ${d.ids.join(", ")}`);
        });
        console.warn("\nResolve these duplicates (edit/delete), then re-run this script.");
        await mongoose.disconnect();
        process.exit(0);
    }

    // 3. Build the per-company unique index.
    await User.syncIndexes();
    console.log("Built compound unique index { companyId, empID }. Done.");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
