const Leave = require("../models/Leave");

/* =========================
   APPLY LEAVE
========================= */
exports.applyLeave = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason
        } = req.body;

        const leave = new Leave({
            userId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason
        });

        await leave.save();

        res.status(201).json({
            success: true,
            message: "Leave applied successfully",
            data: leave
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/* =========================
   GET ALL MY LEAVES
========================= */
exports.getMyLeaves = async (req, res) => {
    try {

        const userId = req.user.id;

        const leaves = await Leave.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: leaves
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/* =========================
   GET ALL LEAVES (Admin)
========================= */
exports.getAllLeaves = async (req, res) => {
    try {

        const leaves = await Leave.find({})
            .populate("userId", "fullName email department designation")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: leaves
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/* =========================
   GET SINGLE LEAVE
========================= */
exports.getLeaveById = async (req, res) => {
    try {

        const userId = req.user.id;
        const { id } = req.params;

        const leave = await Leave.findOne({
            _id: id,
            userId
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        res.status(200).json({
            success: true,
            data: leave
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/* =========================
   CANCEL LEAVE
========================= */
exports.cancelLeave = async (req, res) => {
    try {

        const userId = req.user.id;
        const { id } = req.params;

        const leave = await Leave.findOne({
            _id: id,
            userId
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        if (leave.status === "Approved") {
            return res.status(400).json({
                success: false,
                message: "Approved leave cannot be cancelled"
            });
        }

        await Leave.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Leave cancelled successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/* =========================
   UPDATE LEAVE STATUS (Admin)
========================= */
exports.updateLeaveStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { status } = req.body;

        if (!["Pending", "Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const leave = await Leave.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave status updated successfully",
            data: leave
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};