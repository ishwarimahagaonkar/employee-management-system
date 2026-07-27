const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Brute-force protection for login, keyed on the ACCOUNT being targeted
// rather than the caller's IP.
//
// Keying on IP locked out innocent users: Indian mobile carriers put many
// subscribers behind one public address (CGNAT), and an office shares a
// single WiFi IP, so a handful of colleagues signing in consumed the whole
// quota and everyone after them got "too many attempts" — even with the
// correct password. Successful logins no longer count either; only failures
// burn the allowance.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req, res) => {
        const email =
            typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

        // Fall back to IP only when no account was supplied (malformed request).
        return email ? `login:${email}` : `login-ip:${ipKeyGenerator(req, res)}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Too many failed login attempts for this account. Please wait a few minutes and try again.",
    },
});

// Safety net so one host can't grind through many different accounts.
// Deliberately generous: a whole office or carrier NAT must never trip it
// through normal use, and successful sign-ins are not counted.
const loginIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts from this network. Please try again later.",
    },
});

// General safety net for the whole API surface to absorb runaway clients /
// basic DoS: 300 requests per IP per minute.
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
});

module.exports = { loginLimiter, loginIpLimiter, apiLimiter };
