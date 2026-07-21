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
    }

});

module.exports = mongoose.model("Attendance", attendanceSchema);