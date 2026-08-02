const express = require("express");

const {
    getLabourReport,
    exportLabourReport,
} = require("../controllers/labourReportController");

const { protect, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * LABOUR REPORT ROUTES
 *
 * Filters: site, supervisor, labour and a date range (the app turns Day /
 * Week / Month / Custom into that range). Admins and managers report across
 * the whole company; supervisors are confined to their own sites, whatever
 * they pass in.
 *
 * Available on every subscription plan -- unlike the employee Report screen,
 * this is not gated behind Premium.
 */

// Preview (JSON)
router.get("/", protect, requirePermission("labour:report"), getLabourReport);

// Export (xlsx / csv / pdf)
router.get("/export", protect, requirePermission("labour:report"), exportLabourReport);

module.exports = router;
