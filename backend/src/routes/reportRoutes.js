const express = require("express");
const router = express.Router();

const { getEmployeeReport, exportEmployeeReport } = require("../controllers/reportController");
const { protect, adminOnly, restrictToPremium } = require("../middleware/authMiddleware");

// Preview (JSON)
router.get("/employee", protect, adminOnly, restrictToPremium, getEmployeeReport);

// Export (xlsx / csv / pdf)
router.get("/employee/export", protect, adminOnly, restrictToPremium, exportEmployeeReport);

module.exports = router;
