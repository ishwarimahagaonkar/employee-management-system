const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
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
        lateThresholdMinutes: {
            type: Number,
            default: 30,
        },
        halfDayHours: {
            type: Number,
            default: 4,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
