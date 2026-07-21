// One-off script to bootstrap the first super admin account.
// Usage: node scripts/createSuperAdmin.js
// Reads SUPERADMIN_EMPID / SUPERADMIN_NAME / SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD from .env

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
    const empID = process.env.SUPERADMIN_EMPID || "SUPERADMIN";
    const fullName = process.env.SUPERADMIN_NAME || "Super Admin";
    const email = (process.env.SUPERADMIN_EMAIL || "").toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD;

    if (!email || !password) {
        console.error("Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in backend/.env before running this script.");
        process.exit(1);
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
        console.error(`A user with email ${email} already exists (role: ${existing.role}).`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        empID,
        fullName,
        email,
        password: hashedPassword,
        role: "superadmin",
        companyId: null,
    });

    console.log(`Super admin created: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
