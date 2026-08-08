const express = require("express");

const {
    getSheet,
    saveSheet,
    addToRoster,
    removeFromRoster,
    getLabourHistory,
} = require("../controllers/labourAttendanceController");

const { protect, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * LABOUR ATTENDANCE ROUTES
 *
 * Attendance rows double as the daily site assignment: labour records carry no
 * site, so adding someone to a roster is what says they worked there that day.
 *
 * The flow is two steps by design --
 *   1. POST /roster   put people on a site for a date (unmarked)
 *   2. POST /         mark those people present/absent with times
 * -- because who is on site and whether they turned up are different facts,
 * decided at different moments.
 *
 * Marking is supervisor + admin (admin so a mistake can still be corrected
 * after the supervisor's same-day window closes). Managers can read but not
 * mark. Site ownership is checked again in the controller.
 *
 * Available on every subscription plan -- no Premium gate.
 */

// The roster for one site on one date
router.get("/", protect, requirePermission("labour:view"), getSheet);

// One labourer's attendance history, across whichever sites they worked
router.get("/history", protect, requirePermission("labour:view"), getLabourHistory);

// Add labour to a site's day
router.post("/roster", protect, requirePermission("labour:attendance"), addToRoster);

// Remove someone added to a site's day by mistake
router.delete("/roster", protect, requirePermission("labour:attendance"), removeFromRoster);

// Mark the day's sheet (updates existing roster rows; never creates them)
router.post("/", protect, requirePermission("labour:attendance"), saveSheet);

module.exports = router;
