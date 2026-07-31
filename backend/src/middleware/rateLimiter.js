const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// Verified account id from the Bearer token, or null when there isn't a valid
// one. Verification (rather than a bare decode) means the key can't be spoofed
// to mint unlimited buckets. Runs before `protect`, so it never assumes req.user.
const tokenUserId = (req) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return null;

    try {
        return jwt.verify(header.slice(7), process.env.JWT_SECRET)?.id || null;
    } catch (err) {
        return null;
    }
};

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

// General safety net for the whole API surface, to absorb runaway clients and
// basic DoS: 300 requests per minute.
//
// Keyed on the signed-in ACCOUNT, for the same reason loginLimiter is: an office
// WiFi or a carrier CGNAT puts the whole company behind one public address, so a
// shared per-IP bucket is spent within seconds of the morning punch-in rush and
// every employee then gets 429 on every request -- including login, since this
// runs ahead of the auth routes. One person's runaway client must not be able to
// lock out their colleagues.
//
// Unauthenticated traffic still falls back to IP; login has its own dedicated
// per-account and per-IP limiters on top of this.
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    keyGenerator: (req, res) => {
        const userId = tokenUserId(req);
        return userId ? `api-user:${userId}` : `api-ip:${ipKeyGenerator(req, res)}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
});

module.exports = { loginLimiter, loginIpLimiter, apiLimiter };
