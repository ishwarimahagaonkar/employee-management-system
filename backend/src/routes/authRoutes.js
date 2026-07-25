const express = require("express");

const {
    login,
    logout,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { loginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/login", loginLimiter, login);

router.post("/logout", protect, logout);

module.exports = router;