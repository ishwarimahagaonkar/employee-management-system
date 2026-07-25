// Attendance Model
const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");
const Travel = require("../models/Travel");

// Utility functions
const { isWithinOffice, isValidCoord } = require("../utils/locationCheck");
const { calculateWorkingHours } = require("../utils/timeCalculator");
const { getPagination } = require("../utils/pagination");
const { monthDateRange } = require("../utils/monthRange");

const getOrgSettings = async (companyId) => {
  let settings = await Settings.findOne({ companyId: companyId ?? null });
  if (!settings) {
    settings = await Settings.create({ companyId: companyId ?? null });
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

    const settings = await getOrgSettings(req.user.companyId);

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

    // Validate location data (0 is a valid coordinate, so check type not truthiness)
    if (!isValidCoord(lat) || !isValidCoord(lng)) {
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
      companyId: req.user.companyId,
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

    const settings = await getOrgSettings(req.user.companyId);

    // Validate location data (0 is a valid coordinate)
    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      return res.status(400).json({
        message: "Location required for punch out",
      });
    }

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

    // Prevent a second punch-out from overwriting the first (which would
    // recompute and inflate working hours).
    if (attendance.punchOutTime) {
      return res.status(400).json({
        message: "Already punched out today",
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
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * @desc Site Punch Out (from a client/site location)
 * @route POST /attendance/site-punch-out
 * @access Private
 *
 * For employees who finish at the client site and don't return to office.
 * Unlike the normal punch-out, this BYPASSES the office geofence, but is only
 * allowed once the employee has submitted a meeting record for one of today's
 * completed trips. The punch-out is linked to that trip.
 */
exports.sitePunchOut = async (req, res) => {
  try {
    const { lat, lng, address, photo } = req.body;

    // Location is still required and recorded (it's the client/site location).
    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      return res.status(400).json({
        message: "Location required for site punch out",
      });
    }

    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Require a completed trip today WITH a submitted meeting record. Meetings
    // can only be logged after a trip ends, so a meeting implies the trip ended.
    const travel = await Travel.findOne({ userId: req.user._id, date: todayStr });

    const tripWithMeeting = travel
      ? [...(travel.trips || [])].reverse().find(
          (t) => t.endTime && t.meetingDetails && t.meetingDetails.customerName
        )
      : null;

    if (!tripWithMeeting) {
      return res.status(400).json({
        message: "Submit the meeting record for your trip before punching out from the site.",
        meetingRequired: true,
      });
    }

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayStr,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No punch in found",
      });
    }

    if (attendance.punchOutTime) {
      return res.status(400).json({
        message: "Already punched out today",
      });
    }

    const settings = await getOrgSettings(req.user.companyId);

    // Record the site punch-out, linked to the trip/meeting. No geofence check.
    attendance.punchOutTime = new Date();
    attendance.punchOutLocation = { lat, lng, address };
    attendance.punchOutPhoto = photo;
    attendance.sitePunchOut = true;
    attendance.linkedTripId = tripWithMeeting._id;

    const hours = calculateWorkingHours(attendance.punchInTime, attendance.punchOutTime);
    attendance.workingHours = hours;
    attendance.isHalfDay = hours < settings.halfDayHours;

    await attendance.save();

    res.status(200).json({
      message: "Site punch out successful",
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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

    // Validate inputs before creating/updating a record.
    if (!["punch-in", "punch-out"].includes(type)) {
      return res.status(400).json({ message: "type must be 'punch-in' or 'punch-out'" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A reason is required for an emergency request" });
    }
    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      return res.status(400).json({ message: "Location is required for an emergency request" });
    }

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
        companyId: req.user.companyId,
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

      const settings = await getOrgSettings(req.user.companyId);
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
    res.status(500).json({ message: "Server error" });
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

    const attendance = await Attendance.findOne({ _id: id, companyId: req.user.companyId ?? null });

    if (!attendance) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    // Update request status -- an approved request still counts as late
    // if the punch-in itself happened past the work start + threshold
    if (action === "approve") {
      const settings = await getOrgSettings(req.user.companyId);
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
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * @desc Get Complete Attendance History (all employees)
 * @route GET /attendance
 * @access Admin
 */
exports.getAttendanceByUser = async (req, res) => {
  try {
    const filter = { companyId: req.user.companyId ?? null };
    const { paginate, page, limit, skip } = getPagination(req.query);

    let queryBuilder = Attendance.find(filter)
      .populate("userId", "fullName email department designation")
      .sort({ punchInTime: -1 });
    if (paginate) {
      queryBuilder = queryBuilder.skip(skip).limit(limit);
    }

    const [attendance, total] = await Promise.all([
      queryBuilder,
      Attendance.countDocuments(filter),
    ]);

    res.json({
      count: attendance.length,
      total,
      page: paginate ? page : 1,
      attendance,
    });
  } catch (err) {
    console.error("getAttendanceByUser error:", err);
    res.status(500).json({ message: "Server error" });
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

    const range = monthDateRange(month, year);
    if (!range) {
      return res.status(400).json({ message: "Valid month and year are required" });
    }

    // Index-served range query for the month (no full-history scan).
    const filtered = await Attendance.find({
      userId,
      date: { $gte: range.gte, $lte: range.lte },
    }).sort({ date: 1 });

    const totalHours = filtered.reduce((sum, r) => sum + (r.workingHours || 0), 0);

    res.json({
      month,
      year,
      totalDays: filtered.length,
      totalHours,
      attendance: filtered,
    });
  } catch (err) {
    console.error("getMonthlyAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * @desc Get Logged-in User Attendance
 * @route GET /attendance/me
 * @access Private
 */
exports.getMyAttendance = async (req, res) => {
  try {
    // Returns a raw array for backward compatibility; ?page&limit paginate
    // opt-in (still an array) so growing histories can be bounded.
    const { paginate, limit, skip } = getPagination(req.query);

    let queryBuilder = Attendance.find({ userId: req.user._id }).sort({ date: -1 });
    if (paginate) {
      queryBuilder = queryBuilder.skip(skip).limit(limit);
    }

    const attendance = await queryBuilder;
    res.json(attendance);
  } catch (err) {
    res.status(500).json({
      message: "Server error",
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
      message: "Server error",
    });
  }
};