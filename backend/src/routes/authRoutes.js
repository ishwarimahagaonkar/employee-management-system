const express = require("express");

const {
    login,
    logout,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { loginLimiter, loginIpLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Generous per-network ceiling first, then the strict per-account limit.
router.post("/login", loginIpLimiter, loginLimiter, login);

router.post("/logout", protect, logout);

module.exports = router;