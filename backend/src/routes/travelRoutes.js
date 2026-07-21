const express = require("express");
const router = express.Router();

const travelController = require("../controllers/travelController");
const { protect, adminOnly, restrictToPremium } = require("../middleware/authMiddleware");

/* =========================
   TRAVEL ROUTES
========================= */

// Start Trip
router.post("/start",protect, restrictToPremium, travelController.startTrip);

// End Trip
router.post("/end",protect, restrictToPremium, travelController.endTrip);

// Log meeting details for a trip that has already ended
router.post("/meeting", protect, restrictToPremium, travelController.logMeeting);

// Get today's travel data (for cards)
router.get("/today",protect, restrictToPremium, travelController.getTodayTravel);

// Get full travel history
router.get("/history",protect, restrictToPremium, travelController.getTravelHistory);

// Get all employees' travel data (admin)
router.get("/admin/all", protect, adminOnly, restrictToPremium, travelController.getAllTravel);

module.exports = router;