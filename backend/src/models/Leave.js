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

// Per-user history + overlap checks query by userId and date range.
leaveSchema.index({ userId: 1, startDate: 1, endDate: 1 });
// Admin list of a company's leaves, newest first.
leaveSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("Leave", leaveSchema);