// Reset any user's password by email.
// Usage: node scripts/resetPassword.js --email user@example.com --password newpass

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = (args[i] || "").replace(/^--/, "");
        out[key] = args[i + 1];
    }
    return out;
}

async function run() {
    const { email, password } = parseArgs();

    if (!email || !password) {
        console.error("Usage: node scripts/resetPassword.js --email user@example.com --password newpass");
        process.exit(1);
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        console.error(`No user found with email ${email.toLowerCase()}.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    console.log(`Password reset for ${user.email} (${user.fullName}, ${user.role}).`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
