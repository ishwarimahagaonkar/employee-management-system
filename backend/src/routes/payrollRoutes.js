const express = require("express");

const { calculateMonthlySalary } = require("../controllers/payrollController");

const { protect, adminOnly, restrictToPremium } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/calculate", protect, adminOnly, restrictToPremium, calculateMonthlySalary);

module.exports = router;