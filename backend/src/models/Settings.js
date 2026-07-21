const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },
        companyName: {
            type: String,
            default: "Obsidian.dev",
        },
        industry: {
            type: String,
            default: "Technology",
        },
        companyEmail: {
            type: String,
            default: "admin@obsidian.dev",
        },
        companyPhone: {
            type: String,
            default: "",
        },
        companyAddress: {
            type: String,
            default: "",
        },

        officeLat: {
            type: Number,
            default: 18.4423,
        },
        officeLng: {
            type: Number,
            default: 73.8566,
        },
        geofenceRadius: {
            type: Number,
            default: 200,
        },
        enforceGps: {
            type: Boolean,
            default: true,
        },

        workStartTime: {
            type: String, // "HH:MM"
            default: "09:00",
        },
        workEndTime: {
            type: String, // "HH:MM"
            default: "18:00",
        },
        halfDayHours: {
            type: Number,
            default: 4,
        },

        // Yearly paid leave allotment per employee.
        paidLeaveAllotment: {
            type: Number,
            default: 12,
        },

        // Last year the default national holidays were auto-seeded for this
        // company. Prevents re-adding defaults an admin deliberately deleted.
        holidaySeedYear: {
            type: Number,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
