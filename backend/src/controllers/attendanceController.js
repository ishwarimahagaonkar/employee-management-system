const Attendance = require("../models/Attendance");
const { isWithinOffice } = require("../utils/locationCheck");
const { calculateWorkingHours } = require("../utils/timeCalculator");

exports.punchIn = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const allowed = isWithinOffice(lat, lng);

        if (!allowed) {
            return res.status(403).json({
                message: "Punch In denied: You are outside office location"
            });
        }

        const today = new Date().toDateString();

        const existing = await Attendance.findOne({
            userId: req.user._id,
            date: today
        });

        if (existing) {
            return res.status(400).json({
                message: "Already punched in today"
            });
        }

        const attendance = await Attendance.create({
            userId: req.user._id,
            date: today,
            punchInTime: new Date(),
            punchInLocation: { lat, lng }
        });

        res.json({
            message: "Punch In successful",
            attendance
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.punchOut = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const allowed = isWithinOffice(lat, lng);

        if (!allowed) {
            return res.status(403).json({
                message: "Punch Out denied: You are outside office location"
            });
        }

        const today = new Date().toDateString();

        const attendance = await Attendance.findOne({
            userId: req.user._id,
            date: today
        });

        if (!attendance) {
            return res.status(404).json({
                message: "No punch in found"
            });
        }

        attendance.punchOutTime = new Date();
        attendance.punchOutLocation = { lat, lng };

        // calculate working hours
        const hours = calculateWorkingHours(
            attendance.punchInTime,
            attendance.punchOutTime
        );

        attendance.workingHours = hours;




    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.requestEmergency = async (req, res) => {
    try {
        const { reason, type } = req.body;
        // type = "punchIn" or "punchOut"

        const today = new Date().toDateString();

        let attendance = await Attendance.findOne({
            userId: req.user._id,
            date: today
        });

        if (!attendance && type === "punchIn") {
            attendance = await Attendance.create({
                userId: req.user._id,
                date: today,
                emergencyRequest: true,
                emergencyReason: reason,
                status: "pending"
            });
        } else {
            attendance.emergencyRequest = true;
            attendance.emergencyReason = reason;
            attendance.status = "pending";
            await attendance.save();
        }

        res.json({
            message: "Emergency request sent to admin",
            attendance
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.approveEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const { comment } = req.body;
        // action = approve / reject

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({ message: "Not found" });
        }

        if (action === "approve") {
            attendance.status = "approved";
        } else {
            attendance.status = "rejected";
        }
        attendance.adminComment = comment || "No comment provided";


        await attendance.save();


        res.json({
            message: `Request ${action}d successfully`,
            attendance
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getAttendanceByUser = async (req, res) => {
    try {
        const userId = req.user._id;

        const attendance = await Attendance.find({ userId })
            .sort({ punchInTime: -1 });

        res.json({
            count: attendance.length,
            attendance
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};
exports.getMonthlyAttendance = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month, year } = req.query;

        const records = await Attendance.find({ userId });

        const filtered = records.filter((att) => {
            const date = new Date(att.date);

            return (
                date.toLocaleString("default", { month: "long" }) === month &&
                date.getFullYear().toString() === year
            );
        });

        let totalHours = 0;

        filtered.forEach((r) => {
            totalHours += r.workingHours || 0;
        });

        res.json({
            month,
            year,
            totalDays: filtered.length,
            totalHours,
            attendance: filtered
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};