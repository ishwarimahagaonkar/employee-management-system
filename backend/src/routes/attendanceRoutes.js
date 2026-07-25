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

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my-attendance", protect, getMyAttendance);

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);
router.post("/site-punch-out", protect, sitePunchOut);

router.post("/emergency-request", protect, requestEmergency);
router.put("/emergency/:id", protect, adminOnly, approveEmergency);

router.get("/monthly", protect, getMonthlyAttendance);

router.get(
    "/",
    protect,
    adminOnly,
    getAttendanceByUser
);
router.get(
  "/today",
  protect,
  getTodayAttendance
);

// Declared after the static routes so it can't swallow them.
router.get("/:id/photos", protect, adminOnly, getAttendancePhotos);

module.exports = router;