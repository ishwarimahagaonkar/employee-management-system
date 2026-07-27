const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { calculateSalary } = require("../utils/salaryCalculator");
const { monthDateRange } = require("../utils/monthRange");

// Only these statuses represent days the employee is actually paid for.
const PAYABLE_STATUSES = ["present", "late", "approved"];

exports.calculateMonthlySalary = async (req, res) => {
    try {
        const { userId, month, year } = req.body;

        if (!userId || !month || !year || isNaN(Number(year))) {
            return res.status(400).json({ message: "userId, month and year are required" });
        }

        const range = monthDateRange(month, year);
        if (!range) {
            return res.status(400).json({ message: "Invalid month or year" });
        }

        const employee = await User.findById(userId);

        if (!employee || String(employee.companyId ?? null) !== String(req.user.companyId ?? null)) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        // Index-served range query for the month; only paid statuses count.
        const records = await Attendance.find({
            userId,
            date: { $gte: range.gte, $lte: range.lte },
            status: { $in: PAYABLE_STATUSES },
        }).select("workingHours");

        const totalHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);

        const hourlyRate = employee.hourlyRate || 0;

        const salary = calculateSalary(totalHours, hourlyRate);

        res.json({
            employee: employee.fullName,
            totalHours,
            hourlyRate,
            salary
        });

    } catch (err) {
        console.error("calculateMonthlySalary error:", err);
        res.status(500).json({ message: "Server error" });
    }
};