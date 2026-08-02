const express = require("express");

const {
    createSite,
    getSites,
    getSiteById,
    updateSite,
    assignSupervisor,
} = require("../controllers/siteController");

const { protect, authorize, requirePermission } = require("../middleware/authMiddleware");
const { ROLES } = require("../config/roles");

const router = express.Router();

/**
 * SITE ROUTES
 *
 * Available on every subscription plan -- unlike Travel and Report, sites are
 * not gated behind Premium.
 *
 * Supervisors create sites and edit the ones they run; admins and managers see
 * and manage every site in the company. The read/edit scoping is applied again
 * inside the controller, so a supervisor can never reach a site that isn't
 * theirs even by guessing its id.
 */

// Create a site (supervisor)
router.post("/", protect, requirePermission("site:create"), createSite);

// List sites (supervisor sees their own; admin and manager see all)
router.get("/", protect, requirePermission("site:view"), getSites);

// Single site
router.get("/:id", protect, requirePermission("site:view"), getSiteById);

// Update site details. Open to all three roles here and narrowed in the
// controller: a supervisor may only edit a site assigned to them.
router.put("/:id", protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR), updateSite);

// Reassign a site to a different supervisor (admin and manager only)
router.patch("/:id/supervisor", protect, requirePermission("site:manage"), assignSupervisor);

module.exports = router;
