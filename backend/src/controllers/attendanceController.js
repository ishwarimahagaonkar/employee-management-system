const Attendance = require("../models/Attendance");
const { isWithinOffice } = require("../utils/locationCheck");

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

        await attendance.save();

        res.json({
            message: "Punch Out successful",
            attendance
        });

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