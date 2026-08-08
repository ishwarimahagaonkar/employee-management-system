const mongoose = require("mongoose");

// One attendance record per labourer per day.
//
// This row is also the SITE ASSIGNMENT. Labour records carry no site, so the
// only statement that "Rahul worked Site B on 2 Aug" is this document. Adding
// someone to a site's roster for a day creates the row; marking them fills it
// in. Site history is therefore append-only and can never be rewritten by
// editing a labour record.
//
// Separate from the Attendance collection on purpose: that one's userId is a
// required ref to User, and labour are not users. Keeping them apart also
// means nothing here can disturb the payroll path that reads Attendance.
//
// The ref field is called `labour` rather than `labourId` because the Labour
// document already HAS a field named labourId (the code a supervisor types).
// `attendance.labour.labourId` reads unambiguously; `labourId.labourId` would
// not.

const labourAttendanceSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        labour: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Labour",
            required: true,
        },

        siteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            required: true,
        },

        // Who marked the sheet. Kept even if they later move sites, so the
        // record always says who was accountable that day.
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // "YYYY-MM-DD" in the Asia/Kolkata calendar, matching how the existing
        // Attendance collection stores dates.
        date: {
            type: String,
            required: true,
        },

        // False while the person is on the roster but the supervisor hasn't
        // said present or absent yet. Without this, rostering someone would
        // immediately report them as absent, and a dashboard could never show
        // an honest "still to mark" figure.
        marked: {
            type: Boolean,
            default: false,
        },

        present: {
            type: Boolean,
            default: false,
        },

        // "HH:MM" 24-hour local times. Stored as strings rather than Dates
        // because they describe a clock reading on `date`, not an instant --
        // the same choice Settings makes for workStartTime / workEndTime.
        // Both are null when the labourer was absent.
        punchIn: {
            type: String,
            default: null,
        },

        punchOut: {
            type: String,
            default: null,
        },

        // Derived from punchIn/punchOut, stored so reports can total it
        // without recomputing across thousands of rows.
        workingHours: {
            type: Number,
            default: 0,
        },

        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// "HH:MM", 00:00 to 23:59.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

labourAttendanceSchema.statics.isValidTime = function (value) {
    return typeof value === "string" && TIME_PATTERN.test(value);
};

/**
 * Working hours between two "HH:MM" readings, to two decimals.
 * Returns 0 when either is missing or the pair doesn't make sense, so a bad
 * input can never write a negative total into a report.
 */
labourAttendanceSchema.statics.computeHours = function (punchIn, punchOut) {
    if (!this.isValidTime(punchIn) || !this.isValidTime(punchOut)) return 0;

    const toMinutes = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };

    const minutes = toMinutes(punchOut) - toMinutes(punchIn);
    if (minutes <= 0) return 0;

    return Number((minutes / 60).toFixed(2));
};

// Keeps workingHours honest for any direct save. The bulk path computes the
// same value through computeHours before writing, so the two agree.
//
// No `next` parameter: Mongoose 9 treats document middleware as promise-based.
labourAttendanceSchema.pre("validate", function () {
    // `present` is derived here rather than trusted, so the flag can never
    // disagree with the times beside it no matter which path wrote the row.
    // A shift counts as attended only when BOTH punches are recorded.
    const complete =
        this.constructor.isValidTime(this.punchIn) &&
        this.constructor.isValidTime(this.punchOut);

    this.present = complete;
    this.workingHours = complete
        ? this.constructor.computeHours(this.punchIn, this.punchOut)
        : 0;

    // Deliberately NOT clearing punchIn when the shift is incomplete. The
    // previous version blanked both times whenever `present` was false, which
    // under the punch-in/punch-out flow would wipe the in-time of everyone
    // still on site -- they are false only because they haven't left yet.
});

// One record per labourer per day -- the guarantee behind "mark today's sheet"
// being safe to submit twice.
labourAttendanceSchema.index({ labour: 1, date: 1 }, { unique: true });

// The day's sheet for a site, and the report queries by date range.
labourAttendanceSchema.index({ companyId: 1, siteId: 1, date: -1 });

module.exports = mongoose.model("LabourAttendance", labourAttendanceSchema);
