// Attendance Model
const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");

// Utility functions
const { isWithinOffice } = require("../utils/locationCheck");
const { calculateWorkingHours } = require("../utils/timeCalculator");

const getOrgSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

// Parses "HH:MM" into total minutes since midnight
const parseTimeToMinutes = (hhmm) => {
  const [hours, minutes] = (hhmm || "09:00").split(":").map(Number);
  return hours * 60 + minutes;
};

// True if punchInTime falls after work start time, in Asia/Kolkata timezone
const isPunchInLate = (punchInTime, settings) => {
  const timeInKolkata = new Date(
    new Date(punchInTime).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const minutesSinceMidnight = timeInKolkata.getHours() * 60 + timeInKolkata.getMinutes();
  const workStartMinutes = parseTimeToMinutes(settings.workStartTime);
  return minutesSinceMidnight > workStartMinutes;
};


/**
 * @desc Employee Punch In
 * @route POST /attendance/punch-in
 * @access Private
 *
 * Checks:
 * - User has not already punched in today
 * - Location is within office radius
 * - Marks attendance as Present or Late
 */
exports.punchIn = async (req, res) => {

  try {

    const { lat, lng, address, photo } = req.body;

    const settings = await getOrgSettings();

    // Create today's date string in Asia/Kolkata timezone (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Prevent multiple punch-ins on same day
    const existingAttendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayStr,
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Already punched in today",
      });
    }

    // Validate location data
    if (!lat || !lng) {
      return res.status(400).json({
        message: "Location required for punch in",
      });
    }

    // Verify employee is within office premises (unless GPS enforcement is off)
    const allowed = settings.enforceGps
      ? isWithinOffice(lat, lng, settings.officeLat, settings.officeLng, settings.geofenceRadius)
      : true;

    if (!allowed) {
      return res.status(403).json({
        message: "You are outside office location. You can request permission from your admin.",
        outsideLocation: true,
      });
    }

    const now = new Date();

    const attendanceStatus = isPunchInLate(now, settings) ? "late" : "present";

    // Create attendance record
    const attendance = await Attendance.create({
      userId: req.user._id,
      date: todayStr,
      punchInTime: now,
      punchInLocation: {
        lat,
        lng,
        address,
      },
      punchInPhoto: photo,

      status: attendanceStatus,
    });

    res.status(200).json({
      message: "Punch In successful",
      status: attendanceStatus,
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * @desc Employee Punch Out
 * @route POST /attendance/punch-out
 * @access Private
 *
 * Checks:
 * - Employee is inside office location
 * - Punch-in exists for today
 * - Calculates working hours
 */
exports.punchOut = async (req, res) => {
  try {
    const { lat, lng, address, photo } = req.body;

    const settings = await getOrgSettings();

    // Verify employee location (unless GPS enforcement is off)
    const allowed = settings.enforceGps
      ? isWithinOffice(lat, lng, settings.officeLat, settings.officeLng, settings.geofenceRadius)
      : true;

    if (!allowed) {
      return res.status(403).json({
        message: "You are outside office location. You can request permission from your admin.",
        outsideLocation: true,
      });
    }

    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayStr,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No punch in found",
      });
    }

    // Store punch-out details
    attendance.punchOutTime = new Date();
    attendance.punchOutLocation = { lat, lng, address, };
    attendance.punchOutPhoto = photo;


    // Calculate total working hours
    const hours = calculateWorkingHours(
      attendance.punchInTime,
      attendance.punchOutTime
    );

    attendance.workingHours = hours;
    attendance.isHalfDay = hours < settings.halfDayHours;

    await attendance.save();

    res.status(200).json({
      message: "Punch Out successful",
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * @desc Request Emergency Attendance Approval
 * @route POST /attendance/emergency
 * @access Private
 *
 * Used when employee cannot punch in/out
 * due to location restrictions or other issues.
 */
exports.requestEmergency = async (req, res) => {
  try {
    const { reason, type, lat, lng, address, photo } = req.body;

    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayStr,
    });

    if (type === "punch-in") {
      if (attendance) {
        return res.status(400).json({
          message: "Already punched in today",
        });
      }

      attendance = await Attendance.create({
        userId: req.user._id,
        date: todayStr,
        punchInTime: new Date(),
        punchInLocation: { lat, lng, address },
        punchInPhoto: photo,
        isOutsideLocation: true,
        emergencyRequest: true,
        emergencyReason: reason,
        status: "pending",
      });
    } else {
      if (!attendance) {
        return res.status(404).json({
          message: "No punch in found for today",
        });
      }

      attendance.punchOutTime = new Date();
      attendance.punchOutLocation = { lat, lng, address };
      attendance.punchOutPhoto = photo;
      attendance.isOutsideLocation = true;
      attendance.emergencyRequest = true;
      attendance.emergencyReason = reason;
      attendance.status = "pending";

      const settings = await getOrgSettings();
      const hours = calculateWorkingHours(
        attendance.punchInTime,
        attendance.punchOutTime
      );
      attendance.workingHours = hours;
      attendance.isHalfDay = hours < settings.halfDayHours;

      await attendance.save();
    }

    res.json({
      message: "Request sent to admin for approval",
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * @desc Approve or Reject Emergency Request
 * @route PUT /attendance/emergency/:id
 * @access Admin
 */
exports.approveEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    // Update request status -- an approved request still counts as late
    // if the punch-in itself happened past the work start + threshold
    if (action === "approve") {
      const settings = await getOrgSettings();
      attendance.status = isPunchInLate(attendance.punchInTime, settings)
        ? "late"
        : "approved";
    } else {
      attendance.status = "rejected";
    }

    // Save admin remarks
    attendance.adminComment =
      comment || "No comment provided";

    await attendance.save();

    res.json({
      message: `Request ${action}d successfully`,
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * @desc Get Complete Attendance History (all employees)
 * @route GET /attendance
 * @access Admin
 */
exports.getAttendanceByUser = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate("userId", "fullName email department designation")
      .sort({ punchInTime: -1 });

    res.json({
      count: attendance.length,
      attendance,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


/**
 * @desc Get Monthly Attendance Summary
 * @route GET /attendance/monthly
 * @access Private
 *
 * Returns:
 * - Total working days
 * - Total working hours
 * - Attendance records for selected month
 */
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const records = await Attendance.find({ userId });

    const filtered = records.filter((att) => {
      if (!att.date) return false;
      const [y, m, d] = att.date.split("-");
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

    filtered.forEach((record) => {
      totalHours += record.workingHours || 0;
    });

    res.json({
      month,
      year,
      totalDays: filtered.length,
      totalHours,
      attendance: filtered,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


/**
 * @desc Get Logged-in User Attendance
 * @route GET /attendance/me
 * @access Private
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      userId: req.user._id,
    }).sort({ date: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


/**
 * @desc Get Today's Attendance Record
 * @route GET /attendance/today
 * @access Private
 */
exports.getTodayAttendance = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayStr,
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};