const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");

const employeeRoutes = require("./src/routes/employeeRoutes");

const attendanceRoutes = require("./src/routes/attendanceRoutes");

const payrollRoutes = require("./src/routes/payrollRoutes")

const salarySlipRoutes = require("./src/routes/salarySlipRoutes");

const travelRoutes = require("./src/routes/travelRoutes")

const leaveRoutes = require("./src/routes/leaveRoutes");

const settingsRoutes = require("./src/routes/settingsRoutes");

const reportRoutes = require("./src/routes/reportRoutes");

const companyRoutes = require("./src/routes/companyRoutes");

const holidayRoutes = require("./src/routes/holidayRoutes");

const { apiLimiter } = require("./src/middleware/rateLimiter");
const sanitize = require("./src/middleware/sanitize");

dotenv.config();

// Fail fast if the JWT signing secret is missing or dangerously weak -- every
// token's integrity depends on it, so a bad value must never reach production.
if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    console.warn("WARNING: JWT_SECRET is shorter than 32 characters. Use a long, random secret in production.");
}

connectDB();

const app = express();

// Trust the first proxy hop so client IPs (for rate limiting) and HTTPS are
// read correctly when running behind nginx / a cloud load balancer.
app.set("trust proxy", 1);

// CORS: restrict to an explicit allowlist in production (comma-separated
// CORS_ORIGINS env). If unset, fall back to open CORS but warn -- native mobile
// clients don't send Origin so they're unaffected either way.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

if (allowedOrigins.length > 0) {
    app.use(cors({
        origin: (origin, callback) => {
            // Allow non-browser clients (no Origin header) and allowlisted origins.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
    }));
} else {
    console.warn("WARNING: CORS_ORIGINS is not set. Allowing all origins. Set it to lock down browser access in production.");
    app.use(cors());
}

app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({limit:"10mb", extended: true}));

// Strip Mongo operators from user input (NoSQL-injection guard).
app.use(sanitize);

// General rate limit across the whole API surface.
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.get("/", (req, res) => {
    res.send("API Running...");
});

app.use("/api/attendance", attendanceRoutes);

app.use("/api/payroll", payrollRoutes);

app.use("/api/salary-slip", salarySlipRoutes);

app.use("/api/travel",travelRoutes)

app.use("/api/leave", leaveRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/report", reportRoutes);

app.use("/api/companies", companyRoutes);

app.use("/api/holidays", holidayRoutes);


// JSON 404 for any unmatched route (instead of Express's default HTML page).
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Central error handler: returns JSON and never leaks stack traces. Catches
// malformed-JSON body-parser errors and anything thrown/next(err)'d upstream.
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
        return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "Origin not allowed" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request payload too large" });
    }

    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({ message: "Something went wrong. Please try again." });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
});