const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null
    },

    date: {
        type: String,
        required: true
    },

    // The real punch times. When a punch is queued offline these hold when the
    // employee actually punched, NOT when the server received it -- see
    // utils/capturedAt.js. Payroll, late calculation and working hours all read
    // these, so they must stay the authoritative moment.
    punchInTime: Date,
    punchOutTime: Date,

    // When the server actually received each punch. Equal to the punch time on
    // a live request; later when it came off the offline queue. Kept so a
    // disputed record can be read honestly: "punched 09:04, arrived 14:20" is
    // a fact an admin should be able to see rather than infer.
    punchInReceivedAt: {
        type: Date,
        default: null
    },

    punchOutReceivedAt: {
        type: Date,
        default: null
    },

    // True when that punch spent a meaningful time in the offline queue.
    // Surfaced to admins because a device-asserted time is weaker evidence
    // than a server-observed one, and the pattern is worth being able to see.
    punchInOffline: {
        type: Boolean,
        default: false
    },

    punchOutOffline: {
        type: Boolean,
        default: false
    },

    punchInLocation: {
        lat: Number,
        lng: Number,
        address: String
    },

    punchOutLocation: {
        lat: Number,
        lng: Number,
        address: String
    },

    // Storage reference ("attendance/<file>.jpg"), not the image itself --
    // see utils/photoStorage.js. Legacy rows may still hold raw base64.
    punchInPhoto: String,
    punchOutPhoto: String,

    isOutsideLocation: {
        type: Boolean,
        default: false
    },

    overrideRequested: {
        type: Boolean,
        default: false
    },

    overrideApproved: {
        type: Boolean,
        default: false
    },
    emergencyRequest: {
        type: Boolean,
        default: false
    },

    emergencyReason: {
        type: String
    },
    adminComment: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["present", "late", "pending", "approved", "rejected"],
        default: "present"
    },

    workingHours: {
        type: Number,
        default: 0
    },

    overtimeHours: {
        type: Number,
        default: 0
    },

    isHalfDay: {
        type: Boolean,
        default: false
    },

    // Set when the employee punches out from a client/site location (after
    // submitting the trip's meeting record) instead of the office geofence.
    sitePunchOut: {
        type: Boolean,
        default: false
    },

    // The trip (and its meeting) this punch-out is linked to for a site punch-out.
    linkedTripId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    }

});

// One attendance record per user per day -- enforced by the DATABASE, not just
// by the controller's check.
//
// This index used to be non-unique, leaving the guarantee to a findOne/create
// pair in punchIn(). Those two statements are not atomic, so anything that got
// between them produced two rows for the same day. The realistic trigger was
// never a double tap: it was the 60-second punch request timing out on a weak
// signal, the employee tapping again, and the first request landing after the
// second. punchOut() then updated whichever row findOne happened to return, so
// an employee could read as punched-in-never-out and payroll would total the
// wrong record.
//
// Same guarantee LabourAttendance and DailyWorkReport have always had.
//
// Adding this to an existing deployment needs the old non-unique index dropped
// first -- Mongoose cannot convert one in place and will log an
// IndexOptionsConflict and carry on unprotected. scripts/fixAttendanceDuplicates.js
// does the drop, and checks for pre-existing duplicates before it tries.
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// Admin views list a whole company's attendance by date.
attendanceSchema.index({ companyId: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);