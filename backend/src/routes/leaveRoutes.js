const express = require("express");
const router = express.Router();

const leaveController = require("../controllers/leaveController");
const { adminOnly ,protect} = require("../middleware/authMiddleware");


// Employee
router.post("/apply", protect, leaveController.applyLeave);
router.get("/my-leaves", protect, leaveController.getMyLeaves);
router.get("/:id", protect, leaveController.getLeaveById);
router.delete("/:id", protect, leaveController.cancelLeave);

// Admin
router.get("/", protect, adminOnly, leaveController.getAllLeaves);
router.patch("/:id/status",protect, adminOnly, leaveController.updateLeaveStatus);

module.exports = router;