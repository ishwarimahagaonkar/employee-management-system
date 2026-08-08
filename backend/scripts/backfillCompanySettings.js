/**
 * Repairs settings rows that still carry the old hardcoded company identity.
 *
 * Settings used to default companyName to "Obsidian.dev" and companyEmail to
 * "admin@obsidian.dev". Rows are created lazily and nothing filled these in,
 * so every company that never had an admin edit its settings displayed another
 * company's name. models/Settings.js no longer carries those defaults and
 * utils/companySettings.js seeds new rows from the Company record -- this
 * fixes the rows created before that.
 *
 *   node scripts/backfillCompanySettings.js           # report only
 *   node scripts/backfillCompanySettings.js --apply
 *
 * ONLY rows still holding a stale default or an empty value are touched. A
 * name an admin deliberately typed is left exactly as it is, even where it
 * differs from the Company record -- "Powertech" against a registered
 * "Powertech pvt.ltd" is a display preference, not a bug, and overwriting it
 * would be this script causing the very problem it exists to fix.
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");

// The values the schema used to hand out. Anything matching these was never
// chosen by a human.
const STALE_NAMES = ["Obsidian.dev", "Obsidian", ""];
const STALE_EMAILS = ["admin@obsidian.dev", ""];
const STALE_INDUSTRIES = ["Technology", ""];

const isStale = (value, staleList) =>
    value === undefined || value === null || staleList.includes(String(value).trim());

const line = () => console.log("=".repeat(62));

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    line();
    console.log(`database : ${db.databaseName}`);
    console.log(`mode     : ${APPLY ? "APPLY" : "REPORT ONLY"}`);
    line();

    const companies = new Map(
        (await db.collection("companies").find({}).toArray()).map((c) => [String(c._id), c])
    );

    const rows = await db.collection("settings").find({}).toArray();
    let fixed = 0;
    let kept = 0;

    for (const row of rows) {
        const company = companies.get(String(row.companyId));

        if (!company) {
            console.log(`\n[${row._id}] no matching company -- left alone`);
            continue;
        }

        const update = {};
        if (isStale(row.companyName, STALE_NAMES) && company.name) update.companyName = company.name;
        if (isStale(row.companyEmail, STALE_EMAILS) && company.email) update.companyEmail = company.email;
        if (isStale(row.industry, STALE_INDUSTRIES)) update.industry = "";

        console.log(`\ncompany: ${company.name}`);
        console.log(`   stored name : ${JSON.stringify(row.companyName)}`);
        console.log(`   stored email: ${JSON.stringify(row.companyEmail)}`);

        if (Object.keys(update).length === 0) {
            kept += 1;
            console.log("   -> admin-set values, left untouched");
            continue;
        }

        fixed += 1;
        console.log(`   -> ${APPLY ? "updating" : "would update"}: ${JSON.stringify(update)}`);

        if (APPLY) {
            await db.collection("settings").updateOne({ _id: row._id }, { $set: update });
        }
    }

    line();
    console.log(`${fixed} row(s) ${APPLY ? "repaired" : "would be repaired"}, ${kept} left as set by an admin`);
    if (!APPLY) console.log("Report only -- re-run with --apply to write.");
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

module.exports = { isStale, STALE_NAMES, STALE_EMAILS };
