const express = require("express");

const {
    punchIn,
    punchOut,
    sitePunchOut,
    requestEmergency,
    approveEmergency,
    getAttendanceByUser,
    getAttendancePhotos,
    getMonthlyAttendance,
    getMyAttendance,
    getTodayAttendance
} = require("../controllers/attendanceController");

const { protect, staffOnly, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my-attendance", protect, getMyAttendance);

// staffOnly: an admin administers, it does not attend. Managers, supervisors
// and employees all punch normally.
router.post("/punch-in", protect, staffOnly, punchIn);
router.post("/punch-out", protect, staffOnly, punchOut);
router.post("/site-punch-out", protect, staffOnly, sitePunchOut);

router.post("/emergency-request", protect, staffOnly, requestEmergency);
router.put("/emergency/:id", protect, requirePermission("attendance:viewAll"), approveEmergency);

router.get("/monthly", protect, getMonthlyAttendance);

router.get(
    "/",
    protect,
    requirePermission("attendance:viewAll"),
    getAttendanceByUser
);
router.get(
  "/today",
  protect,
  getTodayAttendance
);

// Declared after the static routes so it can't swallow them.
router.get("/:id/photos", protect, requirePermission("attendance:viewAll"), getAttendancePhotos);

module.exports = router;