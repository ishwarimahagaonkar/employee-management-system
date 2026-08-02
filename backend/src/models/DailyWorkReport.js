const mongoose = require("mongoose");

// One work report per site per day, filed by the supervisor who runs it.
//
// The labour present/absent counts are a SNAPSHOT taken from that day's
// attendance sheet rather than numbers typed in by hand. Two sources for the
// same fact would eventually disagree, and Feature 8's totals need one answer.
//
// There is no images field: photos were explicitly not wanted. Adding them
// later needs only a new field plus a storage route -- nothing here changes.

const dailyWorkReportSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        siteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            required: true,
        },

        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // "YYYY-MM-DD" Asia/Kolkata, as everywhere else in this system.
        date: {
            type: String,
            required: true,
        },

        // "HH:MM" 24-hour clock readings on `date`. Optional -- a report can be
        // filed without pinning the working window.
        startTime: {
            type: String,
            default: null,
        },

        endTime: {
            type: String,
            default: null,
        },

        // Snapshot of the attendance sheet at the moment the report was last
        // saved. Refreshed on edit, so marking attendance after filing the
        // report still ends up reflected.
        labourPresent: {
            type: Number,
            default: 0,
            min: 0,
        },

        labourAbsent: {
            type: Number,
            default: 0,
            min: 0,
        },

        // The one field a report is meaningless without.
        workCompleted: {
            type: String,
            required: true,
            trim: true,
        },

        materialsUsed: { type: String, default: "", trim: true },
        equipmentUsed: { type: String, default: "", trim: true },
        problemsFaced: { type: String, default: "", trim: true },
        safetyIncidents: { type: String, default: "", trim: true },
        additionalNotes: { type: String, default: "", trim: true },

        // Who last wrote the report -- normally the supervisor, but an admin
        // correcting a settled report is recorded here too.
        lastEditedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// "Only ONE report per Site per Day" -- enforced by the database, not just by
// the controller's check, so two simultaneous submissions can't both land.
dailyWorkReportSchema.index({ siteId: 1, date: 1 }, { unique: true });

// Admin and manager list reports company-wide, newest first.
dailyWorkReportSchema.index({ companyId: 1, date: -1 });

module.exports = mongoose.model("DailyWorkReport", dailyWorkReportSchema);
