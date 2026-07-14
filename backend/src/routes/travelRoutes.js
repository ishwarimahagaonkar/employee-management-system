const express = require("express");
const router = express.Router();

const travelController = require("../controllers/travelController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/* =========================
   TRAVEL ROUTES
========================= */

// Start Trip
router.post("/start",protect, travelController.startTrip);

// End Trip
router.post("/end",protect, travelController.endTrip);

// Log meeting details for a trip that has already ended
router.post("/meeting", protect, travelController.logMeeting);

// Get today's travel data (for cards)
router.get("/today",protect, travelController.getTodayTravel);

// Get full travel history
router.get("/history",protect, travelController.getTravelHistory);

// Get all employees' travel data (admin)
router.get("/admin/all", protect, adminOnly, travelController.getAllTravel);

module.exports = router;