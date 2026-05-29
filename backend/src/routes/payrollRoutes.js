const express = require("express");

const { calculateMonthlySalary } = require("../controllers/payrollController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/calculate", protect, adminOnly, calculateMonthlySalary);

module.exports = router;