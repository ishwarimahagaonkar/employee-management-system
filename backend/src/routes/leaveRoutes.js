const express = require("express");
const router = express.Router();

const leaveController = require("../controllers/leaveController");
const { protect, staffOnly, requirePermission } = require("../middleware/authMiddleware");


// Employee (staff only -- an admin doesn't take leave through the app)
router.post("/apply", protect, staffOnly, leaveController.applyLeave);
router.get("/my-leaves", protect, leaveController.getMyLeaves);
router.get("/:id", protect, leaveController.getLeaveById);
router.delete("/:id", protect, leaveController.cancelLeave);

// Approvals (admin and manager)
router.get("/", protect, requirePermission("leave:approve"), leaveController.getAllLeaves);
router.patch("/:id/status",protect, requirePermission("leave:approve"), leaveController.updateLeaveStatus);

module.exports = router;