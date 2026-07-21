// Update the super admin account's details.
// Usage: node scripts/updateSuperAdmin.js [--name "New Name"] [--email new@email.com] [--empid NEWID] [--password newpass]
// Any flag you omit stays unchanged.

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
    const { name, email, empid, password } = parseArgs();

    if (!name && !email && !empid && !password) {
        console.error('Nothing to update. Usage: node scripts/updateSuperAdmin.js [--name "New Name"] [--email new@email.com] [--empid NEWID] [--password newpass]');
        process.exit(1);
    }

    await connectDB();

    const superadmin = await User.findOne({ role: "superadmin" });
    if (!superadmin) {
        console.error("No superadmin account found. Run createSuperAdmin.js first.");
        await mongoose.disconnect();
        process.exit(1);
    }

    if (name) superadmin.fullName = name;
    if (empid) superadmin.empID = empid;
    if (email) {
        const normalized = email.toLowerCase();
        const clash = await User.findOne({ email: normalized, _id: { $ne: superadmin._id } });
        if (clash) {
            console.error(`Another user already uses ${normalized}.`);
            await mongoose.disconnect();
            process.exit(1);
        }
        superadmin.email = normalized;
    }
    if (password) superadmin.password = await bcrypt.hash(password, 10);

    await superadmin.save();
    console.log(`Super admin updated: empID=${superadmin.empID}, name=${superadmin.fullName}, email=${superadmin.email}${password ? ", password changed" : ""}`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
