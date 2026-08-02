const express = require("express");
const router = express.Router();

const travelController = require("../controllers/travelController");
const { protect, staffOnly, restrictToPremium, requirePermission } = require("../middleware/authMiddleware");

/* =========================
   TRAVEL ROUTES
========================= */

// Recording a trip is a staff activity: managers, supervisors and employees
// travel, admins don't. The read routes below are left open so an admin's own
// (historical) travel stays visible to them.

// Start Trip
router.post("/start",protect, staffOnly, restrictToPremium, travelController.startTrip);

// End Trip
router.post("/end",protect, staffOnly, restrictToPremium, travelController.endTrip);

// Log meeting details for a trip that has already ended
router.post("/meeting", protect, staffOnly, restrictToPremium, travelController.logMeeting);

// Get today's travel data (for cards)
router.get("/today",protect, restrictToPremium, travelController.getTodayTravel);

// Get full travel history
router.get("/history",protect, restrictToPremium, travelController.getTravelHistory);

// Get all employees' travel data (oversight view -- admin and manager)
router.get("/admin/all", protect, requirePermission("travel:viewAll"), restrictToPremium, travelController.getAllTravel);

module.exports = router;