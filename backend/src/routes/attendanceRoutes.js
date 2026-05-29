const express = require("express");

const {
    punchIn,
    punchOut,
    requestEmergency,
    approveEmergency,
    getAttendanceByUser,
    getMonthlyAttendance
} = require("../controllers/attendanceController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);

router.post("/emergency-request", protect, requestEmergency);
router.put("/emergency/:id", protect, adminOnly, approveEmergency);

router.get("/monthly", protect, getMonthlyAttendance);

router.get(
    "/",
    protect,
    getAttendanceByUser
);
module.exports = router;