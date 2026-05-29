const express = require("express");

const {
    generateSalarySlip
} = require("../controllers/salarySlipController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// 📄 GENERATE SALARY SLIP PDF
router.get(
    "/generate",
    protect,
    adminOnly,
    generateSalarySlip
);

module.exports = router;