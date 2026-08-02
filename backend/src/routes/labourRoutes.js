const express = require("express");

const {
    createLabour,
    getLabour,
    getLabourById,
    updateLabour,
} = require("../controllers/labourController");

const { protect, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * LABOUR ROUTES
 *
 * Labour never logs in -- these records exist only so attendance can be
 * tracked against them, so there is no auth flow here at all.
 *
 * Supervisors add and edit labour on the sites they run; admins may work on
 * any site in the company; managers can look but not touch. Site ownership is
 * checked again inside the controller, so a supervisor can't reach another
 * site's labour by guessing an id.
 *
 * Available on every subscription plan -- no Premium gate.
 */

// Add labour to a site (admin and supervisor)
router.post("/", protect, requirePermission("labour:manage"), createLabour);

// List labour (admin and manager see all; supervisor sees their sites only)
router.get("/", protect, requirePermission("labour:view"), getLabour);

// Single labour record
router.get("/:id", protect, requirePermission("labour:view"), getLabourById);

// Update labour details (admin and supervisor)
router.put("/:id", protect, requirePermission("labour:manage"), updateLabour);

module.exports = router;
