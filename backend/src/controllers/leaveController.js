const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const Settings = require("../models/Settings");
const { getPagination } = require("../utils/pagination");

const DEFAULT_PAID_ALLOTMENT = 12;

// Sum of Paid leave days already committed (Approved, and optionally Pending)
// for a user in a given calendar year, excluding one leave id if provided.
const paidDaysUsed = async (userId, year, { includePending, excludeId } = {}) => {
    const statuses = includePending ? ["Approved", "Pending"] : ["Approved"];
    const query = {
        userId,
        leaveType: "Paid",
        status: { $in: statuses },
        startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    };
    if (excludeId) query._id = { $ne: excludeId };

    const leaves = await Leave.find(query).select("totalDays");
    return leaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);
};

const getPaidAllotment = async (companyId) => {
    const settings = await Settings.findOne({ companyId: companyId ?? null }).select("paidLeaveAllotment");
    return settings?.paidLeaveAllotment ?? DEFAULT_PAID_ALLOTMENT;
};

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

// Counts only actual working days between two UTC-anchored dates (inclusive):
// excludes weekends and any date in the holiday set, so leave is never spent
// on days the employee wasn't going to work anyway.
const countWorkingDays = (start, end, holidayDates) => {
    let count = 0;
    const cursor = new Date(start.getTime());

    while (cursor <= end) {
        const dow = cursor.getUTCDay(); // 0 = Sun, 6 = Sat
        const dateStr = cursor.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6 && !holidayDates.has(dateStr)) {
            count++;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return count;
};

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

        // --- totalDays is computed server-side (working days only), never
        //     trusted from the client ---
        const holidays = await Holiday.find({
            companyId: req.user.companyId ?? null,
            date: { $gte: startDate, $lte: endDate },
        }).select("date");
        const holidayDates = new Set(holidays.map((h) => h.date));

        const totalDays = countWorkingDays(start, end, holidayDates);

        if (totalDays === 0) {
            return res.status(400).json({
                success: false,
                message: "The selected range has no working days (only weekends/holidays)",
            });
        }

        // --- Paid-leave balance enforcement ---
        // A Paid request may not push the year's committed Paid days (approved +
        // still-pending) past the company's allotment.
        if (leaveType === "Paid") {
            const year = startDate.slice(0, 4);
            const allotment = await getPaidAllotment(req.user.companyId);
            const used = await paidDaysUsed(userId, year, { includePending: true });

            if (used + totalDays > allotment) {
                return res.status(400).json({
                    success: false,
                    message: `This request (${totalDays} day(s)) exceeds your remaining paid leave. Allotment ${allotment}, already used/pending ${used} for ${year}.`,
                });
            }
        }

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
        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Leave.find({ userId }).sort({ createdAt: -1 });
        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [leaves, total] = await Promise.all([
            queryBuilder,
            paginate ? Leave.countDocuments({ userId }) : Promise.resolve(undefined),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: paginate ? page : 1,
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
        const filter = { companyId: req.user.companyId ?? null };
        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Leave.find(filter)
            .populate("userId", "fullName email department designation")
            .sort({ createdAt: -1 });
        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [leaves, total] = await Promise.all([
            queryBuilder,
            Leave.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: paginate ? page : 1,
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

        const leave = await Leave.findOne({ _id: id, companyId: req.user.companyId ?? null });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        // Approving a Paid leave must not push the year's APPROVED Paid days
        // past the company's allotment.
        if (status === "Approved" && leave.leaveType === "Paid") {
            const year = leave.startDate.slice(0, 4);
            const allotment = await getPaidAllotment(leave.companyId);
            const approvedElsewhere = await paidDaysUsed(leave.userId, year, { excludeId: leave._id });

            if (approvedElsewhere + (leave.totalDays || 0) > allotment) {
                return res.status(400).json({
                    success: false,
                    message: `Approving this leave would exceed the paid allotment (${allotment}) for ${year}. Already approved: ${approvedElsewhere} day(s).`,
                });
            }
        }

        leave.status = status;
        await leave.save();

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