const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { calculateSalary } = require("../utils/salaryCalculator");

exports.calculateMonthlySalary = async (req, res) => {
    try {
        const { userId, month, year } = req.body;

        const employee = await User.findById(userId);

        if (!employee || String(employee.companyId ?? null) !== String(req.user.companyId ?? null)) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        // get all attendance records
        const records = await Attendance.find({ userId });

        const filtered = records.filter(record => {
            if (!record.date) return false;
            const [y, m, d] = record.date.split("-");
            if (y !== year.toString()) return false;

            const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
            const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

            const mIdx = parseInt(m, 10) - 1;
            const recordMonthLong = monthNames[mIdx];
            const recordMonthShort = shortMonthNames[mIdx];

            const searchMonth = month.toString().toLowerCase();
            return searchMonth === recordMonthLong ||
                   searchMonth === recordMonthShort ||
                   searchMonth === m ||
                   parseInt(searchMonth, 10) === parseInt(m, 10);
        });

        let totalHours = 0;

        filtered.forEach(record => {
            totalHours += record.workingHours || 0;
        });

        const hourlyRate = employee.hourlyRate || 100; // default fallback

        const salary = calculateSalary(totalHours, hourlyRate);

        res.json({
            employee: employee.fullName,
            totalHours,
            hourlyRate,
            salary
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};