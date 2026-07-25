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

    punchInTime: Date,
    punchOutTime: Date,

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

// Main per-user lookup (findOne by userId+date on every punch / today check).
// Non-unique to stay safe against any legacy duplicate rows; the punch-in
// controller already enforces one record per user per day.
attendanceSchema.index({ userId: 1, date: 1 });
// Admin views list a whole company's attendance by date.
attendanceSchema.index({ companyId: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);