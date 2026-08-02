const express = require("express");
const router = express.Router();

const { getEmployeeReport, exportEmployeeReport } = require("../controllers/reportController");
const { protect, requirePermission, restrictToPremium } = require("../middleware/authMiddleware");

// Preview (JSON)
router.get("/employee", protect, requirePermission("report:company"), restrictToPremium, getEmployeeReport);

// Export (xlsx / csv / pdf)
router.get("/employee/export", protect, requirePermission("report:company"), restrictToPremium, exportEmployeeReport);

module.exports = router;
