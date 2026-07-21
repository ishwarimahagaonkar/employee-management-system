const express = require("express");

const {
    generateSalarySlip
} = require("../controllers/salarySlipController");

const { protect, adminOnly, restrictToPremium } = require("../middleware/authMiddleware");

const router = express.Router();

// 📄 GENERATE SALARY SLIP PDF
router.get(
    "/generate",
    protect,
    adminOnly,
    restrictToPremium,
    generateSalarySlip
);

module.exports = router;