const express = require("express");

const {
    createReport,
    getReports,
    getReportById,
    updateReport,
} = require("../controllers/dailyReportController");

const { protect, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * SUPERVISOR DAILY WORK UPDATE
 *
 * One report per site per day. Supervisors file and edit their own sites'
 * reports (same day only); admins and managers read every report in the
 * company; employees have no access at all.
 *
 * Admin also holds dailyReport:submit so a settled report can still be
 * corrected -- see config/roles.js.
 *
 * Available on every subscription plan -- no Premium gate.
 */

// File today's report
router.post("/", protect, requirePermission("dailyReport:submit"), createReport);

// List reports (scoped to the caller's sites when they're a supervisor)
router.get("/", protect, requirePermission("dailyReport:view"), getReports);

// One report
router.get("/:id", protect, requirePermission("dailyReport:view"), getReportById);

// Edit a report
router.put("/:id", protect, requirePermission("dailyReport:submit"), updateReport);

module.exports = router;
