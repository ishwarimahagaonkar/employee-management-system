// One-off script to migrate companies onto the new 2-tier plan enum (Standard/Premium).
// Any company whose subscription.plan is not one of the new enum values (e.g. the old
// Trial/Basic/Enterprise values) is moved to "Premium" so nobody loses access they already had.
// Usage: node scripts/migratePlans.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Company = require("../src/models/Company");

const VALID_PLANS = ["Standard", "Premium"];

async function run() {
    await connectDB();

    const companies = await Company.find({});
    let updated = 0;

    for (const company of companies) {
        const currentPlan = company.subscription?.plan;

        if (!VALID_PLANS.includes(currentPlan)) {
            company.subscription.plan = "Premium";
            await company.save();
            updated += 1;
            console.log(`Migrated "${company.name}" from "${currentPlan}" to "Premium"`);
        }
    }

    console.log(`Done. ${updated}/${companies.length} companies migrated.`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
