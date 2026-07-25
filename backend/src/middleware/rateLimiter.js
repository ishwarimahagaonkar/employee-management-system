const rateLimit = require("express-rate-limit");

// Strict limiter for the login endpoint to blunt brute-force / credential
// stuffing: 10 attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again in a few minutes." },
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

module.exports = { loginLimiter, apiLimiter };
