const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { calculateSalary } = require("../utils/salaryCalculator");

exports.calculateMonthlySalary = async (req, res) => {
    try {
        const { userId, month, year } = req.body;

        const employee = await User.findById(userId);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        // get all attendance records
        const records = await Attendance.find({
            userId,
            date: {
                $regex: `${month} ${year}`
            }
        });

        let totalHours = 0;

        records.forEach(record => {
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