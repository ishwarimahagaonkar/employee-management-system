const express = require("express");

const { getDashboard } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { ROLES } = require("../config/roles");

const router = express.Router();

/**
 * ROLE DASHBOARD
 *
 * One endpoint returning a payload shaped for whichever role is asking.
 *
 * Employees are excluded on purpose: they already have their own dashboard,
 * built from their own records via the existing per-employee endpoints. This
 * one reports across other people, which an employee may not see.
 *
 * Available on every subscription plan -- no Premium gate.
 */
router.get(
    "/",
    protect,
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR),
    getDashboard
);

module.exports = router;
