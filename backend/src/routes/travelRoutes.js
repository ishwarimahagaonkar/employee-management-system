const express = require("express");
const router = express.Router();

const travelController = require("../controllers/travelController");
const { protect } = require("../middleware/authMiddleware");

/* =========================
   TRAVEL ROUTES
========================= */

// Start Trip
router.post("/start",protect, travelController.startTrip);

// End Trip
router.post("/end",protect, travelController.endTrip);

// Get today's travel data (for cards)
router.get("/today",protect, travelController.getTodayTravel);

// Get full travel history
router.get("/history",protect, travelController.getTravelHistory);

module.exports = router;