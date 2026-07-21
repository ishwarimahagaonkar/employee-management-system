// Seeds the default national holiday list (current year) for all existing
// companies, plus the legacy null-company scope. Skips dates a company
// already has a holiday on, so re-running is safe.
// Usage: node scripts/seedDefaultHolidays.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Company = require("../src/models/Company");
const Holiday = require("../src/models/Holiday");
const { defaultHolidaysForYear } = require("../src/utils/defaultHolidays");

async function seedForCompany(companyId, label, defaults) {
    let added = 0;

    for (const h of defaults) {
        const existing = await Holiday.findOne({ companyId, date: h.date });
        if (!existing) {
            await Holiday.create({ ...h, companyId });
            added += 1;
        }
    }

    console.log(`${label}: added ${added}/${defaults.length} default holidays`);
}

async function run() {
    await connectDB();

    const year = new Date().getFullYear();
    const defaults = defaultHolidaysForYear(year);

    const companies = await Company.find({}).select("name");

    for (const company of companies) {
        await seedForCompany(company._id, company.name, defaults);
    }

    // Legacy accounts created before multi-company support share the null scope.
    await seedForCompany(null, "(legacy, no company)", defaults);

    console.log("Done.");
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
