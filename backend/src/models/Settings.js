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

// One settings document per company -- enforced by the database.
//
// Every controller reads settings with findOne({ companyId }), so a second
// document for the same company does not fail loudly: it makes findOne return
// an arbitrary one of the two. An admin changes the geofence or the late
// cut-off and it appears to work only intermittently, because half the punches
// read the other row. That is close to undiagnosable from user reports.
//
// getOrgSettings() runs on EVERY punch, which gave this the widest concurrency
// exposure of any path in the system. The callers now upsert atomically; this
// index is what makes the guarantee real rather than conventional.
//
// null is a value to MongoDB, so this also allows exactly one companyId: null
// document -- the pre-multi-tenant row -- which is the intent.
settingsSchema.index({ companyId: 1 }, { unique: true });

module.exports = mongoose.model("Settings", settingsSchema);
