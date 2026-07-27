// Diagnostic: lists non-superadmin users that have no companyId (the shared
// "legacy" tenant). These should be migrated into a real company so tenant
// isolation is complete. This script only REPORTS -- it changes nothing.
//
// Usage: node scripts/reportLegacyUsers.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
    await connectDB();

    const legacy = await User.find({
        role: { $ne: "superadmin" },
        $or: [{ companyId: null }, { companyId: { $exists: false } }],
    }).select("empID fullName email role");

    if (legacy.length === 0) {
        console.log("No legacy (null-company) non-superadmin users. Tenant isolation is clean.");
    } else {
        console.log(`Found ${legacy.length} user(s) with no companyId (shared legacy tenant):\n`);
        legacy.forEach((u) => {
            console.log(`  ${u.role.padEnd(8)} | ${u.empID} | ${u.fullName} | ${u.email} | _id=${u._id}`);
        });
        console.log("\nMigrate each into a real company (set companyId) so their data is isolated.");
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
