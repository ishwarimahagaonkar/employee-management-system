const express = require("express");

const {
    getSheet,
    saveSheet,
    getLabourHistory,
} = require("../controllers/labourAttendanceController");

const { protect, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * LABOUR ATTENDANCE ROUTES
 *
 * The day's sheet is read and written as a whole, because that is how a
 * supervisor actually fills it in -- one pass down the crew list.
 *
 * Marking is supervisor + admin (admin so a mistake can still be corrected
 * after the supervisor's same-day window closes). Managers can read but not
 * mark. Site ownership is checked again in the controller.
 *
 * Available on every subscription plan -- no Premium gate.
 */

// The crew sheet for one site on one date
router.get("/", protect, requirePermission("labour:view"), getSheet);

// One labourer's attendance history
router.get("/history", protect, requirePermission("labour:view"), getLabourHistory);

// Save the day's sheet (upserts, so re-submitting is safe)
router.post("/", protect, requirePermission("labour:attendance"), saveSheet);

module.exports = router;
