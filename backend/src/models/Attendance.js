const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    date: {
        type: String,
        required: true
    },

    punchInTime: Date,
    punchOutTime: Date,

    punchInLocation: {
        lat: Number,
        lng: Number
    },

    punchOutLocation: {
        lat: Number,
        lng: Number
    },

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
        enum: ["present", "pending", "approved", "rejected"],
        default: "present"
    }
});

module.exports = mongoose.model("Attendance", attendanceSchema);