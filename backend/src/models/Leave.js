const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
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

    leaveType: {
        type: String,
        enum: ["Paid", "Unpaid"],
        required: true
    },

    startDate: {
        type: String, // Format: "2026-06-27"
        required: true
    },

    endDate: {
        type: String, // Format: "2026-06-30"
        required: true
    },

    totalDays: {
        type: Number,
        required: true
    },

    reason: {
        type: String,
        required: true,
        trim: true
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Leave", leaveSchema);