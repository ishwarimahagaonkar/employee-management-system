// Diagnostic for the role-system rollout. This script only REPORTS -- it
// changes nothing -- and answers the two questions that decide whether the
// next step is safe to ship:
//
//   1. Which admin accounts are being used to record attendance or travel?
//      Those people lose that ability once admins are blocked from punching,
//      and should be converted to Manager first.
//
//   2. Which companies would exceed their subscription seat limit once
//      managers and supervisors start counting against it?
//
// Usage: node scripts/auditRoleImpact.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Company = require("../src/models/Company");
const Attendance = require("../src/models/Attendance");
const Travel = require("../src/models/Travel");
const { SEAT_ROLES } = require("../src/config/roles");

async function auditAdminStaffUsage() {
    console.log("=".repeat(70));
    console.log("1. ADMIN ACCOUNTS USED AS STAFF");
    console.log("=".repeat(70));

    const admins = await User.find({ role: "admin" }).select("empID fullName email companyId");

    if (admins.length === 0) {
        console.log("No admin accounts found.\n");
        return;
    }

    const affected = [];

    for (const admin of admins) {
        const [attendanceCount, travelCount] = await Promise.all([
            Attendance.countDocuments({ userId: admin._id }),
            Travel.countDocuments({ userId: admin._id }),
        ]);

        if (attendanceCount > 0 || travelCount > 0) {
            affected.push({ admin, attendanceCount, travelCount });
        }
    }

    if (affected.length === 0) {
        console.log(`Checked ${admins.length} admin account(s). None have attendance or travel`);
        console.log("records, so blocking admin punch-in affects nobody.\n");
        return;
    }

    console.log(`${affected.length} of ${admins.length} admin account(s) record their own work.`);
    console.log("These people lose punch-in / punch-out / travel when the block ships:\n");

    affected.forEach(({ admin, attendanceCount, travelCount }) => {
        console.log(
            `  ${admin.empID} | ${admin.fullName} | ${admin.email}` +
            `\n      attendance records: ${attendanceCount}   travel records: ${travelCount}` +
            `\n      _id=${admin._id}  companyId=${admin.companyId ?? "(none)"}`
        );
    });

    console.log("\nExisting records stay readable either way. To keep these people punching,");
    console.log("change their role to 'manager' -- a manager has every employee feature plus");
    console.log("management rights.\n");
}

async function auditSeatLimits() {
    console.log("=".repeat(70));
    console.log("2. SUBSCRIPTION SEAT LIMITS UNDER THE NEW COUNTING RULE");
    console.log("=".repeat(70));
    console.log(`Seat-consuming roles: ${SEAT_ROLES.join(", ")} (admins remain free)\n`);

    const companies = await Company.find().select("name subscription.employeeLimit subscription.plan");

    if (companies.length === 0) {
        console.log("No companies found.\n");
        return;
    }

    const overLimit = [];

    for (const company of companies) {
        const limit = company.subscription?.employeeLimit;
        if (!limit) continue;

        // What the limit counts today.
        const currentCount = await User.countDocuments({
            role: "employee",
            companyId: company._id,
        });

        // What it will count once manager and supervisor are seat roles.
        const newCount = await User.countDocuments({
            role: { $in: SEAT_ROLES },
            companyId: company._id,
        });

        if (newCount > limit) {
            overLimit.push({ company, limit, currentCount, newCount });
        }
    }

    if (overLimit.length === 0) {
        console.log(`Checked ${companies.length} compan(ies). None exceed their seat limit under`);
        console.log("the new rule, so the change is safe to enable.\n");
        return;
    }

    console.log(`${overLimit.length} compan(ies) would be over their limit:\n`);

    overLimit.forEach(({ company, limit, currentCount, newCount }) => {
        console.log(
            `  ${company.name} (${company.subscription?.plan})` +
            `\n      limit: ${limit}   counted today: ${currentCount}   counted after: ${newCount}` +
            `\n      _id=${company._id}`
        );
    });

    console.log("\nExisting users are never removed -- an over-limit company simply cannot");
    console.log("add more staff until its limit is raised.\n");
}

async function run() {
    await connectDB();

    await auditAdminStaffUsage();
    await auditSeatLimits();

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
