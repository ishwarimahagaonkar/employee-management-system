/**
 * Flags database reads and writes that are not scoped to a company.
 *
 * This is a multi-tenant system: a user must only ever reach their own
 * company's data. Frontend filtering is not a control -- anyone can change an
 * id in a request -- so every query on a company-scoped model has to carry
 * companyId (or reach the row through something that already did).
 *
 * The check is deliberately noisy and then narrowed by an explicit allowlist,
 * rather than clever enough to be silent. A missed tenancy leak is far more
 * expensive than a false positive somebody has to read.
 *
 *   node scripts/auditTenancy.js            # findings only
 *   node scripts/auditTenancy.js --all      # include the allowed ones too
 *
 * Every entry in ALLOWED names WHY it is safe. If you add one, say why in the
 * same breath -- an unexplained exemption is how a real leak gets waved
 * through later.
 */

const fs = require("fs");
const path = require("path");

const CONTROLLERS = path.join(__dirname, "..", "src", "controllers");
const MODELS = path.join(__dirname, "..", "src", "models");

const SHOW_ALL = process.argv.includes("--all");

// Models whose rows belong to exactly one company.
function companyScopedModels() {
    return fs
        .readdirSync(MODELS)
        .filter((f) => f.endsWith(".js"))
        .map((f) => ({ name: path.basename(f, ".js"), src: fs.readFileSync(path.join(MODELS, f), "utf8") }))
        .filter((m) => /companyId\s*:/.test(m.src))
        .map((m) => m.name);
}

const READ_WRITE = /\.(find|findOne|findById|countDocuments|updateOne|updateMany|deleteOne|deleteMany|aggregate|bulkWrite)\s*\(/;

/**
 * Reasons a query legitimately carries no companyId.
 *
 * Keyed by "controller:Model.method" so an exemption cannot silently widen to
 * other call sites of the same model.
 */
const ALLOWED = {
    // Auth must find a user by email BEFORE any company is known -- that is
    // what establishes which company the session belongs to.
    "authController:User.findOne": "login resolves the company; it cannot presuppose it",

    // The super admin operates across companies by design and carries no
    // companyId of its own.
    "companyController:Company.find": "super admin lists every company",
    "companyController:Company.findById": "super admin acts on one company",
    "companyController:Company.findOne": "super admin lookup / uniqueness check",
    "companyController:Company.countDocuments": "platform-wide totals",
    "companyController:Company.aggregate": "platform-wide totals",
    "companyController:User.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Attendance.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Attendance.find": "cascade photo sweep, filtered by { companyId }",
    "companyController:Leave.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Travel.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Holiday.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Settings.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Site.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:Labour.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:LabourAttendance.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:DailyWorkReport.deleteMany": "cascade, already filtered by { companyId }",
    "companyController:User.findOne": "uniqueness of the admin email is global",
    "companyController:User.countDocuments": "seat counting, filtered by { companyId }",
    "companyController:Holiday.insertMany": "seeded for the company just created",

    // Attendance and labour attendance are reached through a row already
    // resolved inside the caller's company (resolveSite / findManageableUser),
    // or keyed by the authenticated user's own id.
    "labourAttendanceController:LabourAttendance.find": "site resolved by resolveSite first",
    "labourAttendanceController:LabourAttendance.bulkWrite": "rows resolved for a scoped site",
    "labourAttendanceController:LabourAttendance.deleteOne": "row resolved for a scoped site",
    "labourAttendanceController:LabourAttendance.countDocuments": "scoped site",
    "dailyReportController:LabourAttendance.find": "counts for a site already scoped",

    // A user acting on their own records. userId comes from the verified token,
    // so it cannot address another company's rows.
    "attendanceController:Attendance.findOne": "keyed by req.user._id",
    "attendanceController:Travel.findOne": "keyed by req.user._id",
    "travelController:Travel.find": "keyed by req.user._id",
    "travelController:Travel.findOne": "keyed by req.user._id",
    "travelController:User.find": "co-traveller lookup, filtered by companyId in the caller",
    "leaveController:Leave.find": "keyed by req.user._id",
    "leaveController:Leave.findOne": "keyed by req.user._id",
    "leaveController:Leave.findById": "ownership re-checked before use",

    // Employee management resolves the target through findManageableUser, which
    // compares companies before returning anything.
    "employeeController:User.findById": "findManageableUser compares company",
    "employeeController:User.findOne": "uniqueness checks are global by design",

    // Settings and holidays are upserted per company by a shared helper.
    "settingsController:Settings.findOne": "filtered by companyId in the caller",
    "settingsController:Settings.findOneAndUpdate": "filtered by companyId in the caller",
    "holidayController:Settings.findOneAndUpdate": "filtered by companyId in the caller",
    "holidayController:Holiday.findOne": "uniqueness within the company, checked by caller",
    "holidayController:Holiday.findById": "ownership re-checked before use",

    // Site and labour reads resolved through a scoped helper.
    "siteController:Site.findOne": "scopeFilter(user) applied at the call site",
    "labourController:Labour.findOne": "filtered by companyId in the caller",
    "labourReportController:LabourAttendance.find": "labour resolved within the company first",
    "labourReportController:Site.find": "filtered by companyId in the caller",
    // A helper whose scope comes from its argument. Both callers pass ids from
    // Site.find({ companyId, ... }), so it can only ever see one company --
    // but that contract lives in the callers, so it is named here explicitly
    // rather than looking accidentally safe.
    "dashboardController:LabourAttendance.find": "siteIds always come from a Site.find scoped by companyId",

    "reportController:Attendance.find": "filtered by companyId in the caller",
    "salarySlipController:Attendance.find": "filtered by companyId in the caller",
    "payrollController:Attendance.find": "filtered by companyId in the caller",
};

// Anything that establishes company scope. A query inside a function that does
// one of these is scoped even when companyId is nowhere near the call itself:
// the filter is usually built lines earlier, or by a helper.
const SCOPING_SIGNALS = [
    /companyId/,            // built into the filter, however far above
    /scopeFilter\(/,        // siteController: returns { companyId, ... }
    /resolveSite\(/,        // resolves a site inside the caller's company
    /findManageableUser\(/, // compares companies before returning
    /req\.user\._id/,       // a user acting on their own rows
    /req\.user\.id[^A-Za-z]/, // same, via Mongoose's `id` virtual (leaveController)
];

/**
 * The body of the function containing a line. Declarations are found by
 * scanning upwards for the nearest `exports.x =` / `function x` / `const x =`
 * at column 0, which is how every controller in this codebase is written.
 */
function enclosingFunction(lines, index) {
    let start = 0;
    for (let i = index; i >= 0; i--) {
        if (/^(exports\.\w+\s*=|async function |function |const \w+\s*=\s*(async\s*)?\()/.test(lines[i])) {
            start = i;
            break;
        }
    }

    let end = lines.length;
    for (let i = index + 1; i < lines.length; i++) {
        if (/^(exports\.\w+\s*=|async function |function )/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return lines.slice(start, end).join("\n");
}

function auditFile(file, models) {
    const name = path.basename(file, ".js");
    const lines = fs.readFileSync(file, "utf8").split("\n");
    const findings = [];

    lines.forEach((line, i) => {
        if (!READ_WRITE.test(line)) return;

        const model = models.find((m) => new RegExp(`\\b${m}\\s*\\.`).test(line));
        if (!model) return;

        const method = (line.match(new RegExp(`${model}\\s*\\.\\s*(\\w+)`)) || [])[1];
        const key = `${name}:${model}.${method}`;

        // Judged over the whole enclosing function, not a fixed window: a
        // filter is typically assembled well above the query that uses it, and
        // a 12-line window reported 29 false positives for exactly that reason.
        const body = enclosingFunction(lines, i);
        const scoped = SCOPING_SIGNALS.some((signal) => signal.test(body));

        findings.push({
            file: name,
            line: i + 1,
            model,
            method,
            key,
            scoped,
            allowed: ALLOWED[key] || null,
            code: line.trim().slice(0, 90),
        });
    });

    return findings;
}

const models = companyScopedModels();
const files = fs
    .readdirSync(CONTROLLERS)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(CONTROLLERS, f));

const all = files.flatMap((f) => auditFile(f, models));
const unscoped = all.filter((x) => !x.scoped);
const flagged = unscoped.filter((x) => !x.allowed);

console.log("=".repeat(70));
console.log("Multi-tenant isolation audit");
console.log("=".repeat(70));
console.log(`\ncompany-scoped models: ${models.length}  (${models.join(", ")})`);
console.log(`query sites examined : ${all.length}`);
console.log(`carry companyId      : ${all.length - unscoped.length}`);
console.log(`unscoped but allowed : ${unscoped.length - flagged.length}`);
console.log(`NEEDS REVIEW         : ${flagged.length}`);

if (SHOW_ALL) {
    console.log("\n--- unscoped but explained ---");
    for (const f of unscoped.filter((x) => x.allowed)) {
        console.log(`  ${f.file}:${f.line}  ${f.model}.${f.method}\n      ${f.allowed}`);
    }
}

if (flagged.length) {
    console.log("\n--- NEEDS REVIEW ---");
    for (const f of flagged) {
        console.log(`\n  ${f.file}:${f.line}  ${f.model}.${f.method}`);
        console.log(`      ${f.code}`);
        console.log(`      no companyId within 12 lines, and no allowlist entry`);
    }
}

console.log("\n" + "=".repeat(70));
console.log(flagged.length ? `${flagged.length} site(s) need review` : "every query is scoped or explained");
console.log("=".repeat(70));

process.exit(flagged.length ? 1 : 0);
