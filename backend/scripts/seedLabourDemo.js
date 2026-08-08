/**
 * Demo data for the labour rework: one supervisor, two sites, ten labourers.
 *
 * Everything created here is tagged with a DEMO- prefix on the fields that are
 * unique anyway (empID, site code, labourId) plus a DEMO_EMAIL_DOMAIN login.
 * That tag is the whole safety story: --remove deletes ONLY records carrying
 * it, so demo data can never take a real record with it on the way out.
 *
 * Nothing is written unless --apply is passed. The default is a dry run,
 * because this connects to whatever MONGO_URI says -- which is currently the
 * production Atlas cluster, not a local database.
 *
 *   node scripts/seedLabourDemo.js --company <id>            # dry run
 *   node scripts/seedLabourDemo.js --company <id> --apply    # write
 *   node scripts/seedLabourDemo.js --company <id> --remove   # clean up
 *
 * Unlike migrateLabourToGlobal.js, this file does NOT run on require(): the
 * entry point is guarded below so importing it (to test it, say) is harmless.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");
const Site = require("../src/models/Site");
const Labour = require("../src/models/Labour");
const { ROLES } = require("../src/config/roles");

// --- markers -------------------------------------------------------------
const TAG = "DEMO-";
const DEMO_EMAIL_DOMAIN = "demo.local";

// Attendance and reports filed against demo sites are copied here before
// removal. Those were entered by hand while testing and, unlike the seeded
// records, re-running the seeder would not bring them back.
const BACKUP_DIR = path.join(__dirname, "..", "backups");

// Same cost factor employeeController uses, so the demo login behaves exactly
// like a real one rather than being a special case.
const BCRYPT_ROUNDS = 10;
const DEMO_PASSWORD = "Demo@12345";

const arg = (name) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (hit) return hit.split("=").slice(1).join("=");

    const idx = process.argv.indexOf(`--${name}`);
    return idx !== -1 ? process.argv[idx + 1] : undefined;
};

const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");

// One login per role that touches the labour module, so each side of the
// permission matrix can actually be exercised: the supervisor writes, the
// manager reads, the admin oversees. Employee is deliberately absent -- it has
// no labour access at all, so a demo one would prove nothing.
//
// NOTE: these are created directly rather than through employeeController, so
// the subscription seat limit is not consulted. Manager and supervisor DO
// consume seats (see consumesSeat in config/roles.js), so a company already at
// its limit will be over it while these exist.
const USERS = [
    {
        empID: `${TAG}ADM01`,
        fullName: "Demo Admin",
        email: `demo.admin@${DEMO_EMAIL_DOMAIN}`,
        role: ROLES.ADMIN,
        department: "Administration",
        designation: "Administrator",
    },
    {
        empID: `${TAG}MGR01`,
        fullName: "Demo Manager",
        email: `demo.manager@${DEMO_EMAIL_DOMAIN}`,
        role: ROLES.MANAGER,
        department: "Operations",
        designation: "Operations Manager",
    },
    {
        empID: `${TAG}SUP01`,
        fullName: "Demo Supervisor",
        email: `demo.supervisor@${DEMO_EMAIL_DOMAIN}`,
        role: ROLES.SUPERVISOR,
        department: "Site Operations",
        designation: "Site Supervisor",
    },
];

// The sites belong to the supervisor; the other two oversee them.
const SUPERVISOR = USERS.find((u) => u.role === ROLES.SUPERVISOR);

const SITES = [
    { code: `${TAG}S1`, name: "Demo Site - Riverside Phase 1", location: "Pune, Maharashtra" },
    { code: `${TAG}S2`, name: "Demo Site - Hilltop Warehouse", location: "Nashik, Maharashtra" },
];

// Ten labourers, deliberately varied: two without a phone, because a
// phone-less record is the case the partial unique index exists for and the
// one most likely to break a roster screen.
const LABOUR = [
    { n: "Rajesh Kumar", m: "9800000001", a: "Kothrud, Pune" },
    { n: "Sunil Yadav", m: "9800000002", a: "Hadapsar, Pune" },
    { n: "Imran Shaikh", m: "9800000003", a: "Kondhwa, Pune" },
    { n: "Mahesh Pawar", m: "9800000004", a: "Warje, Pune" },
    { n: "Santosh Jadhav", m: "9800000005", a: "Baner, Pune" },
    { n: "Vikas Chavan", m: "9800000006", a: "Nashik Road" },
    { n: "Ganesh More", m: "9800000007", a: "Panchavati, Nashik" },
    { n: "Arjun Bhosale", m: "9800000008", a: "Satpur, Nashik" },
    { n: "Lakhan Sonawane", m: "", a: "Camp, Pune" },
    { n: "Ravi Gaikwad", m: "", a: "Deolali, Nashik" },
];

const line = () => console.log("=".repeat(62));

async function run() {
    const companyId = arg("company");

    await mongoose.connect(process.env.MONGO_URI);
    const host = (process.env.MONGO_URI.match(/@([^/?]+)/) || [])[1] || "local";

    line();
    console.log(`database : ${mongoose.connection.db.databaseName} @ ${host}`);
    console.log(`mode     : ${REMOVE ? "REMOVE" : APPLY ? "APPLY (writing)" : "DRY RUN (nothing written)"}`);
    line();

    if (!companyId) {
        console.log("\n--company <id> is required. Companies on this database:\n");
        const companies = await mongoose.connection.db
            .collection("companies")
            .find({}, { projection: { name: 1 } })
            .toArray();

        for (const c of companies) {
            console.log(`   ${c._id.toString()}   ${c.name}`);
        }
        console.log("");
        await mongoose.disconnect();
        process.exit(1);
    }

    // ---------------------------------------------------------------- remove
    if (REMOVE) {
        const emails = USERS.map((u) => u.email);
        const users = await User.find({ email: { $in: emails } });
        const sites = await Site.find({ companyId, code: { $regex: `^${TAG}` } });
        const labour = await Labour.find({ companyId, labourIdKey: { $regex: `^${TAG}` } });

        // Anything filed AGAINST a demo site has to go with it. These are not
        // tagged themselves -- a supervisor creates them through the normal UI
        // -- so they are found by which site they point at. Missing this would
        // leave reports referencing a site that no longer exists, which every
        // listing screen would then have to defend against.
        const siteIds = sites.map((s) => s._id);
        const db = mongoose.connection.db;

        const attendanceCount = await db
            .collection("labourattendances")
            .countDocuments({ siteId: { $in: siteIds } });
        const reportCount = await db
            .collection("dailyworkreports")
            .countDocuments({ siteId: { $in: siteIds } });

        console.log(`users      : ${users.length}  ${users.map((u) => u.role).join(", ")}`);
        console.log(`sites      : ${sites.length}`);
        console.log(`labour     : ${labour.length}`);
        console.log(`attendance : ${attendanceCount}  (rows on demo sites)`);
        console.log(`reports    : ${reportCount}  (filed against demo sites)`);

        if (!APPLY) {
            console.log("\nDry run -- pass --remove --apply to actually delete.");
            await mongoose.disconnect();
            return;
        }

        // Backed up before anything is deleted. These were created by hand
        // during testing and cannot be regenerated by re-running the seeder.
        if (attendanceCount || reportCount) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            const file = path.join(BACKUP_DIR, `demo-activity-${Date.now()}.json`);
            fs.writeFileSync(file, JSON.stringify({
                labourAttendance: await db.collection("labourattendances").find({ siteId: { $in: siteIds } }).toArray(),
                dailyWorkReports: await db.collection("dailyworkreports").find({ siteId: { $in: siteIds } }).toArray(),
            }, null, 2));
            console.log(`\nbackup written: ${file}`);
        }

        // Children first, so nothing is ever left pointing at a deleted parent.
        const attendance = await db
            .collection("labourattendances")
            .deleteMany({ siteId: { $in: siteIds } });
        const reports = await db
            .collection("dailyworkreports")
            .deleteMany({ siteId: { $in: siteIds } });

        await Labour.deleteMany({ companyId, labourIdKey: { $regex: `^${TAG}` } });
        await Site.deleteMany({ companyId, code: { $regex: `^${TAG}` } });
        await User.deleteMany({ email: { $in: emails } });

        console.log(`\nremoved: ${attendance.deletedCount} attendance row(s), ` +
            `${reports.deletedCount} report(s), ${labour.length} labour, ` +
            `${sites.length} site(s), ${users.length} user(s).`);
        await mongoose.disconnect();
        return;
    }

    // ------------------------------------------------------------------ seed
    // Every step is find-then-create so re-running is safe: the unique indexes
    // on email, site code and labourIdKey would reject a blind insert anyway,
    // and a half-failed seed is worse than an idempotent one.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const hashed = APPLY ? await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS) : null;

    console.log("\nusers");
    const accounts = {};

    for (const u of USERS) {
        let existing = await User.findOne({ email: u.email });
        console.log(`   ${u.role.padEnd(11)} ${u.email.padEnd(30)} ${existing ? "(exists)" : "(would create)"}`);

        if (!existing && APPLY) {
            existing = await User.create({
                ...u,
                companyId,
                password: hashed,
                joiningDate: today,
            });
        }

        accounts[u.role] = existing;
    }

    const supervisor = accounts[ROLES.SUPERVISOR] || null;

    console.log("\nsites");
    const created = [];
    for (const s of SITES) {
        const existing = await Site.findOne({ companyId, code: s.code });
        console.log(`   ${s.code}  ${s.name}  ${existing ? "(exists)" : "(would create)"}`);

        if (!existing && APPLY) {
            created.push(await Site.create({
                ...s,
                companyId,
                supervisorId: supervisor?._id ?? null,
                status: "active",
                createdBy: supervisor?._id ?? null,
            }));
        }
    }

    console.log("\nlabour");
    let made = 0;
    for (let i = 0; i < LABOUR.length; i++) {
        const row = LABOUR[i];
        const labourId = `${TAG}L${String(i + 1).padStart(2, "0")}`;
        const existing = await Labour.findOne({ companyId, labourIdKey: labourId.toUpperCase() });

        console.log(`   ${labourId}  ${row.n.padEnd(18)} ${row.m || "(no phone)"}  ${existing ? "(exists)" : "(would create)"}`);

        if (!existing && APPLY) {
            // No siteId: labour is company-wide now, and the site it worked
            // is recorded on the attendance row instead.
            await Labour.create({
                companyId,
                labourId,
                fullName: row.n,
                mobile: row.m,
                address: row.a,
                status: "active",
                createdBy: supervisor?._id ?? null,
            });
            made++;
        }
    }

    line();
    if (APPLY) {
        console.log("Seeded.\n");
        console.log(`  password for all three: ${DEMO_PASSWORD}\n`);
        for (const u of USERS) {
            console.log(`  ${u.role.padEnd(11)} ${u.email}`);
        }
        console.log(`\n  sites : ${created.length} created`);
        console.log(`  labour: ${made} created`);
        console.log(`\nRemove it all again with:`);
        console.log(`  node scripts/seedLabourDemo.js --company ${companyId} --remove --apply`);
    } else {
        console.log("Dry run -- nothing was written. Re-run with --apply to create.");
    }
    line();

    await mongoose.disconnect();
}

// Guarded so require()-ing this file has no side effects.
if (require.main === module) {
    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { run, TAG, SUPERVISOR, SITES, LABOUR };
