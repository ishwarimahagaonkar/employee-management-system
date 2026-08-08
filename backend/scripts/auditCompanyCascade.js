/**
 * Fails if any model carrying a companyId is missing from the company-delete
 * cascade, or if any orphaned rows already exist.
 *
 * The cascade in companyController.deleteCompany is a hand-maintained list.
 * Four models (Site, Labour, LabourAttendance, DailyWorkReport) were added
 * with the labour feature and never added to it, so deleting a company left
 * their rows behind: pointing at a company that no longer existed, invisible
 * to every screen, and counted by nothing. Nothing failed, which is what made
 * it survive so long.
 *
 * This reads the cascade out of the controller source rather than duplicating
 * it, so the check cannot drift from the thing it is checking.
 *
 *   node scripts/auditCompanyCascade.js           # static check only
 *   node scripts/auditCompanyCascade.js --db      # also scan for orphans
 *
 * Worth running in CI, or at least before any release that adds a model.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const CHECK_DB = process.argv.includes("--db");

const MODELS_DIR = path.join(__dirname, "..", "src", "models");
const CONTROLLER = path.join(__dirname, "..", "src", "controllers", "companyController.js");

const line = () => console.log("=".repeat(62));

function modelsWithCompanyId() {
    return fs
        .readdirSync(MODELS_DIR)
        .filter((f) => f.endsWith(".js"))
        .map((f) => ({ name: path.basename(f, ".js"), src: fs.readFileSync(path.join(MODELS_DIR, f), "utf8") }))
        .filter((m) => /companyId\s*:/.test(m.src))
        .map((m) => m.name);
}

function cascadedModels() {
    const src = fs.readFileSync(CONTROLLER, "utf8");
    const names = new Set();

    for (const match of src.matchAll(/(\w+)\.deleteMany\(\{\s*companyId\s*\}\)/g)) {
        names.add(match[1]);
    }

    return [...names];
}

async function main() {
    const declared = modelsWithCompanyId();
    const cascaded = cascadedModels();

    line();
    console.log("Company-delete cascade audit");
    line();

    console.log(`\nmodels carrying companyId (${declared.length}):`);
    console.log("   " + declared.join(", "));

    console.log(`\ndeleted by deleteCompany (${cascaded.length}):`);
    console.log("   " + cascaded.join(", "));

    // Company itself is removed with findByIdAndDelete, not deleteMany.
    const missing = declared.filter((m) => !cascaded.includes(m) && m !== "Company");

    console.log("");
    if (missing.length) {
        console.log(`MISSING FROM CASCADE (${missing.length}):`);
        for (const m of missing) console.log(`   ${m}  <-- rows would be orphaned`);
    } else {
        console.log("every model with a companyId is covered");
    }

    if (!CHECK_DB) {
        line();
        console.log(missing.length ? "FAILED" : "PASSED (static check only -- pass --db to scan for orphans)");
        line();
        process.exit(missing.length ? 1 : 0);
    }

    // --- orphan scan --------------------------------------------------------
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const companyIds = (await db.collection("companies").find({}, { projection: { _id: 1 } }).toArray())
        .map((c) => String(c._id));

    console.log(`\norphan scan against ${companyIds.length} existing companies:`);

    let orphans = 0;
    for (const name of declared) {
        if (name === "Company") continue;

        // Mongoose pluralisation is not guessable for every name, so the model
        // is loaded to ask it directly.
        let collection;
        try {
            collection = require(path.join(MODELS_DIR, name)).collection.name;
        } catch (err) {
            console.log(`   ${name.padEnd(20)} (could not load model, skipped)`);
            continue;
        }

        const rows = await db
            .collection(collection)
            .find({ companyId: { $ne: null } }, { projection: { companyId: 1 } })
            .toArray();

        const bad = rows.filter((r) => !companyIds.includes(String(r.companyId))).length;
        orphans += bad;
        console.log(`   ${name.padEnd(20)} ${String(bad).padStart(4)} orphaned of ${rows.length}`);
    }

    await mongoose.disconnect();

    line();
    const failed = missing.length > 0 || orphans > 0;
    console.log(failed ? `FAILED -- ${missing.length} gap(s), ${orphans} orphaned row(s)` : "PASSED");
    line();
    process.exit(failed ? 1 : 0);
}

// Guarded: requiring this file must never run it.
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { modelsWithCompanyId, cascadedModels };
