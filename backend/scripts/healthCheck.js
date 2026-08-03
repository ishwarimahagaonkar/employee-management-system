// Checks a running backend is actually healthy -- no credentials needed.
//
// It answers the four questions that matter when you're not sure whether the
// server is working:
//   1. Is it up and serving?
//   2. Is every route group mounted? (401 = mounted and asking for a token;
//      404 = the code isn't there, which is what a stale deploy looks like)
//   3. Can it reach MongoDB? (a login attempt has to query the users
//      collection before it can reject you -- a DB failure shows up as 500)
//   4. Does it handle malformed input without falling over?
//
// Usage:
//   node scripts/healthCheck.js                       (localhost:5000)
//   node scripts/healthCheck.js http://10.0.0.5:5000  (from another machine)
//   node scripts/healthCheck.js https://api.spereon.codes

const BASE = (process.argv[2] || "http://localhost:5000").replace(/\/$/, "");

let passed = 0;
let failed = 0;

const ok = (name, detail = "") => {
    passed++;
    console.log(`  PASS  ${name}${detail ? `  (${detail})` : ""}`);
};

const bad = (name, detail) => {
    failed++;
    console.log(`  FAIL  ${name}  -> ${detail}`);
};

async function call(method, path, options = {}) {
    const res = await fetch(BASE + path, {
        method,
        headers: options.body !== undefined ? { "Content-Type": "application/json" } : {},
        body: options.body,
    });

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }

    return { status: res.status, body: json, text };
}

// Every route group, with the status an unauthenticated request should get.
// 404 here is the signal that the running code predates these routes.
const ROUTES = [
    ["GET", "/api/employees"],
    ["GET", "/api/attendance/my-attendance"],
    ["GET", "/api/leave/my-leaves"],
    ["GET", "/api/travel/today"],
    ["GET", "/api/settings"],
    ["GET", "/api/holidays"],
    ["GET", "/api/report/employee"],
    ["GET", "/api/companies"],
    // Payroll exposes no GET -- probe the route it actually has, or this
    // reports a 404 that only means "wrong verb".
    ["POST", "/api/payroll/calculate"],
    ["GET", "/api/salary-slip/generate"],
    // Feature 4-12 routes -- the ones that 404 on an un-deployed server.
    ["GET", "/api/sites"],
    ["GET", "/api/labour"],
    ["GET", "/api/labour-attendance"],
    ["GET", "/api/daily-reports"],
    ["GET", "/api/labour-reports"],
    ["GET", "/api/dashboard"],
];

async function run() {
    console.log(`\nHealth check: ${BASE}\n${"=".repeat(58)}`);

    // --- 1. Is it up? -----------------------------------------------------
    console.log("\n1. Server responding");
    try {
        const root = await call("GET", "/");
        if (root.status === 200) ok("GET / responds", root.text.slice(0, 24));
        else bad("GET / responds", `status ${root.status}`);
    } catch (error) {
        console.log(`  FAIL  cannot connect -> ${error.message}`);
        console.log("\nThe server isn't reachable at that address. Is it running?");
        console.log("  cd backend && npm run dev\n");
        process.exit(1);
    }

    // --- 2. Are all the routes mounted? -----------------------------------
    console.log("\n2. Routes mounted (401/403 = mounted, 404 = missing)");
    let missing = 0;

    for (const [method, path] of ROUTES) {
        const res = await call(method, path);

        if (res.status === 404) {
            bad(`${method} ${path}`, "404 Route not found");
            missing++;
        } else if (res.status === 401 || res.status === 403) {
            ok(`${method} ${path}`, `${res.status}`);
        } else {
            // Anything else still proves the route exists.
            ok(`${method} ${path}`, `${res.status}`);
        }
    }

    // --- 3. Can it reach the database? ------------------------------------
    console.log("\n3. Database reachable");
    const login = await call("POST", "/api/auth/login", {
        body: JSON.stringify({ email: "healthcheck@example.invalid", password: "wrong-password" }),
    });

    if (login.status === 400 && /invalid credentials/i.test(login.body?.message || "")) {
        ok("login query reached MongoDB", "rejected unknown user");
    } else if (login.status === 500) {
        bad("login query reached MongoDB", "500 -- the database is probably unreachable");
    } else {
        bad("login query reached MongoDB", `unexpected ${login.status}: ${login.body?.message}`);
    }

    // --- 4. Bad input handling --------------------------------------------
    console.log("\n4. Malformed input");
    const badJson = await call("POST", "/api/auth/login", { body: "{not json" });
    if (badJson.status === 400) ok("malformed JSON rejected cleanly", "400");
    else bad("malformed JSON rejected cleanly", `got ${badJson.status}`);

    const noBody = await call("POST", "/api/auth/login");
    if (noBody.status !== 500) ok("request with no body doesn't 500", `${noBody.status}`);
    else bad("request with no body doesn't 500", "500 -- the req.body default is missing");

    // --- Summary ----------------------------------------------------------
    console.log("\n" + "=".repeat(58));
    console.log(`${passed} passed, ${failed} failed`);

    if (missing > 0) {
        console.log(
            `\n${missing} route(s) returned 404. The running server is on older code ` +
            `than this checkout -- deploy it, or restart the local server.`
        );
    } else if (failed === 0) {
        console.log("\nBackend is healthy.");
    }

    process.exit(failed ? 1 : 0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
