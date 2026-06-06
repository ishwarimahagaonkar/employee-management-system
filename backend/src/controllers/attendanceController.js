const Attendance = require("../models/Attendance");
const { isWithinOffice } = require("../utils/locationCheck");
const { calculateWorkingHours } = require("../utils/timeCalculator");
const { COMPANY_LOCATION } = require("../config/location");


exports.punchIn = async (req, res) => {
  try {
    console.log("REQ USER:", req.user);
    console.log("REQ BODY:", req.body);
    const { lat, lng } = req.body;
    const today = new Date();
today.setHours(0, 0, 0, 0);

    // Check if employee already punched in today
    const existingAttendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Already punched in today"
      });
    }

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Location required for punch in"
      });
    }

    const allowed = isWithinOffice(lat, lng);

    if (!allowed) {
      return res.status(403).json({
        message: "You are outside office location. Punch In denied."
      });
    }

    const now = new Date();

    // Today's 9:30 AM
    const lateTime = new Date();
    lateTime.setHours(9, 30, 0, 0);

    const attendanceStatus = now > lateTime ? "late" : "present";

    const attendance = await Attendance.create({
        userId: req.user._id,
        date: today,

        punchInTime: now,

        punchInLocation: {
            lat,
            lng
        },

        status: attendanceStatus
    });
    res.status(200).json({
      message: "Punch In successful",
      status: attendanceStatus,
      attendance
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

        await attendance.save();

        res.status(200).json({
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
exports.getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      userId: req.user._id
    }).sort({ date: -1 });

    res.json(attendance);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};