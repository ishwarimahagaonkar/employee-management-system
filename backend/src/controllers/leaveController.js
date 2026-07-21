const Leave = require("../models/Leave");

// Strictly validates a "YYYY-MM-DD" string and returns a UTC-anchored Date,
// or null if the string is missing / malformed / not a real calendar date.
const parseDateStr = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00Z`);
    // Round-trip guards against impossible dates like 2026-02-31 (which JS
    // would otherwise roll forward to March).
    if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return null;
    }
    return date;
};

// Inclusive day count between two "YYYY-MM-DD" dates.
const inclusiveDayCount = (start, end) =>
    Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;

/* =========================
   APPLY LEAVE
========================= */
exports.applyLeave = async (req, res) => {
    try {
        const userId = req.user.id;

        const { leaveType, startDate, endDate, reason } = req.body;

        // --- Required fields ---
        if (!leaveType || !startDate || !endDate || !reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Leave type, start date, end date and reason are required",
            });
        }

        if (!["Paid", "Unpaid"].includes(leaveType)) {
            return res.status(400).json({
                success: false,
                message: "Leave type must be 'Paid' or 'Unpaid'",
            });
        }

        // --- Date validation ---
        const start = parseDateStr(startDate);
        const end = parseDateStr(endDate);

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: "Dates must be valid calendar dates in YYYY-MM-DD format",
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                message: "End date cannot be before start date",
            });
        }

        // --- Overlap check: reject if any non-rejected leave intersects the range ---
        const overlapping = await Leave.findOne({
            userId,
            status: { $ne: "Rejected" },
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
        });

        if (overlapping) {
            return res.status(409).json({
                success: false,
                message: "You already have a leave request overlapping these dates",
            });
        }

        // --- totalDays is computed server-side, never trusted from the client ---
        const totalDays = inclusiveDayCount(start, end);

        const leave = new Leave({
            userId,
            companyId: req.user.companyId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason: reason.trim(),
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

        const leaves = await Leave.find({ companyId: req.user.companyId ?? null })
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

        const leave = await Leave.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId ?? null },
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