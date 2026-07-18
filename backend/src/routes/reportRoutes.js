const express = require("express");
const router = express.Router();

const { getEmployeeReport, exportEmployeeReport } = require("../controllers/reportController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Preview (JSON)
router.get("/employee", protect, adminOnly, getEmployeeReport);

// Export (xlsx / csv / pdf)
router.get("/employee/export", protect, adminOnly, exportEmployeeReport);

module.exports = router;
