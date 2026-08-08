const DailyWorkReport = require("../models/DailyWorkReport");
const LabourAttendance = require("../models/LabourAttendance");
const Site = require("../models/Site");
const { getPagination } = require("../utils/pagination");
const { ROLES } = require("../config/roles");

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidTime = (v) => typeof v === "string" && TIME_PATTERN.test(v);

// Free-text fields the supervisor may fill in. Listed explicitly so a request
// can't write to anything else on the document.
const TEXT_FIELDS = [
    "workCompleted",
    "materialsUsed",
    "equipmentUsed",
    "problemsFaced",
    "safetyIncidents",
    "additionalNotes",
];


/**
 * Loads a site the user may file or read a report for.
 * Returns { site } or { error, status }.
 */
const resolveSite = async (siteId, user, { forWrite }) => {
    if (!siteId) return { error: "Site is required", status: 400 };

    const site = await Site.findOne({
        _id: String(siteId),
        companyId: user.companyId ?? null,
    }).catch(() => null);

    if (!site) return { error: "Site not found", status: 404 };

    if (
        user.role === ROLES.SUPERVISOR &&
        String(site.supervisorId ?? "") !== String(user._id)
    ) {
        return {
            error: forWrite
                ? "You can only file reports for sites assigned to you"
                : "You can only view reports for sites assigned to you",
            status: 403,
        };
    }

    return { site };
};


/**
 * Present/absent counts for a site on a date, read from the attendance sheet.
 * This is the single source of those numbers -- they are never typed in.
 *
 * Counted on punchIn, NOT on the `present` flag. `present` means the full
 * shift was recorded (punched in and out), which is only true once people have
 * gone home; a report filed at 2pm with the whole crew still working would
 * otherwise read zero present. Turning up is what the report is about, so
 * anyone with an in-time counts, and absent stays "rostered but never punched
 * in" -- which is exactly how absence is recorded now that there is no
 * separate absent button.
 */
const labourCountsFor = async (siteId, date) => {
    const records = await LabourAttendance.find({ siteId, date }).select("punchIn");

    const present = records.filter((r) => !!r.punchIn).length;

    return {
        labourPresent: present,
        labourAbsent: records.length - present,
        marked: records.length,
    };
};


/**
 * Whether this user may still change an existing report.
 *
 * "Supervisor can edit only on the same day" -- measured from when the report
 * was filed, so a report filed today stays editable through the day. The
 * MANAGER is exempt, otherwise a mistake found tomorrow could never be
 * corrected. Admin used to hold that exemption and no longer does: it is
 * read-only on daily reports now, overseeing through them rather than
 * authoring them.
 */
const canEditReport = (report, user) => {
    if (user.role === ROLES.MANAGER) return true;

    const filedOn = new Date(report.createdAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });

    return filedOn === todayStr();
};


// Validates and normalises the writable body fields shared by create/update.
// Returns { error } or { values }.
const readBody = (body) => {
    const values = {};

    if (body.startTime !== undefined) {
        if (body.startTime && !isValidTime(body.startTime)) {
            return { error: "Start time must look like 09:00" };
        }
        values.startTime = body.startTime || null;
    }

    if (body.endTime !== undefined) {
        if (body.endTime && !isValidTime(body.endTime)) {
            return { error: "End time must look like 18:00" };
        }
        values.endTime = body.endTime || null;
    }

    for (const field of TEXT_FIELDS) {
        if (body[field] !== undefined) values[field] = String(body[field]);
    }

    return { values };
};


// ==========================
// SUBMIT DAILY WORK REPORT
// ==========================
exports.createReport = async (req, res) => {
    try {
        const { siteId } = req.body;
        const date = req.body.date || todayStr();

        if (!DATE_PATTERN.test(date)) {
            return res.status(400).json({ message: "Date must look like 2026-08-01" });
        }

        if (date > todayStr()) {
            return res.status(400).json({ message: "You can't file a report for a future date" });
        }

        if (!req.body.workCompleted || !String(req.body.workCompleted).trim()) {
            return res.status(400).json({ message: "Work completed is required" });
        }

        const { site, error, status } = await resolveSite(siteId, req.user, { forWrite: true });
        if (error) {
            return res.status(status).json({ message: error });
        }

        const { values, error: bodyError } = readBody(req.body);
        if (bodyError) {
            return res.status(400).json({ message: bodyError });
        }

        if (values.startTime && values.endTime && values.endTime <= values.startTime) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        // Checked here to produce the exact wording the spec asks for; the
        // unique (siteId, date) index is what actually guarantees it.
        const existing = await DailyWorkReport.findOne({ siteId: site._id, date }).select("_id");

        if (existing) {
            return res.status(409).json({
                message: date === todayStr()
                    ? "Today's report already submitted."
                    : `A report for ${site.name} on ${date} has already been submitted.`,
                reportId: existing._id,
            });
        }

        const counts = await labourCountsFor(site._id, date);

        const report = await DailyWorkReport.create({
            ...values,
            companyId: req.user.companyId ?? null,
            siteId: site._id,
            // The site's supervisor is credited even when an admin files it,
            // so the report always says who was accountable on the ground.
            supervisorId: site.supervisorId ?? req.user._id,
            date,
            labourPresent: counts.labourPresent,
            labourAbsent: counts.labourAbsent,
            lastEditedBy: req.user._id,
        });

        return res.status(201).json({
            message: "Daily report submitted",
            // Surfaced so the app can warn rather than silently filing a report
            // that claims nobody was on site.
            attendanceMarked: counts.marked > 0,
            report,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Today's report already submitted." });
        }
        console.error("createReport error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// LIST REPORTS
// ==========================
exports.getReports = async (req, res) => {
    try {
        const filter = { companyId: req.user.companyId ?? null };

        // Supervisors are confined to their own sites; admin and manager see
        // the whole company.
        if (req.user.role === ROLES.SUPERVISOR) {
            const sites = await Site.find({
                companyId: req.user.companyId ?? null,
                supervisorId: req.user._id,
            }).select("_id");

            filter.siteId = { $in: sites.map((s) => s._id) };
        }

        if (req.query.siteId) {
            const { error, status } = await resolveSite(req.query.siteId, req.user, { forWrite: false });
            if (error) {
                return res.status(status).json({ message: error });
            }
            filter.siteId = String(req.query.siteId);
        }

        if (req.query.startDate && req.query.endDate) {
            if (!DATE_PATTERN.test(req.query.startDate) || !DATE_PATTERN.test(req.query.endDate)) {
                return res.status(400).json({ message: "Dates must look like 2026-08-01" });
            }
            filter.date = { $gte: req.query.startDate, $lte: req.query.endDate };
        } else if (req.query.date) {
            if (!DATE_PATTERN.test(req.query.date)) {
                return res.status(400).json({ message: "Date must look like 2026-08-01" });
            }
            filter.date = req.query.date;
        }

        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = DailyWorkReport.find(filter)
            .populate("siteId", "name code")
            .populate("supervisorId", "empID fullName")
            .sort({ date: -1, createdAt: -1 });

        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [reports, total] = await Promise.all([
            queryBuilder,
            DailyWorkReport.countDocuments(filter),
        ]);

        return res.status(200).json({
            count: reports.length,
            total,
            page: paginate ? page : 1,
            reports,
        });

    } catch (error) {
        console.error("getReports error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET ONE REPORT
// ==========================
exports.getReportById = async (req, res) => {
    try {
        const report = await DailyWorkReport.findOne({
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        })
            .populate("siteId", "name code supervisorId")
            .populate("supervisorId", "empID fullName")
            .catch(() => null);

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (
            req.user.role === ROLES.SUPERVISOR &&
            String(report.siteId?.supervisorId ?? "") !== String(req.user._id)
        ) {
            return res.status(403).json({
                message: "You can only view reports for sites assigned to you",
            });
        }

        return res.status(200).json({
            report,
            editable: canEditReport(report, req.user),
        });

    } catch (error) {
        console.error("getReportById error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// UPDATE REPORT (same day only for supervisors)
// ==========================
exports.updateReport = async (req, res) => {
    try {
        const report = await DailyWorkReport.findOne({
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        }).populate("siteId", "name code supervisorId").catch(() => null);

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (
            req.user.role === ROLES.SUPERVISOR &&
            String(report.siteId?.supervisorId ?? "") !== String(req.user._id)
        ) {
            return res.status(403).json({
                message: "You can only edit reports for sites assigned to you",
            });
        }

        if (!canEditReport(report, req.user)) {
            return res.status(403).json({
                message: "This report can only be edited on the day it was submitted. Ask an admin to change it.",
            });
        }

        const { values, error } = readBody(req.body);
        if (error) {
            return res.status(400).json({ message: error });
        }

        if (values.workCompleted !== undefined && !values.workCompleted.trim()) {
            return res.status(400).json({ message: "Work completed can't be empty" });
        }

        // Compared against whatever ends up stored, not just what was sent, so
        // changing only one of the two times is still checked against the other.
        const startTime = values.startTime !== undefined ? values.startTime : report.startTime;
        const endTime = values.endTime !== undefined ? values.endTime : report.endTime;

        if (startTime && endTime && endTime <= startTime) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        Object.assign(report, values);

        // Re-snapshot the counts: attendance is often marked after the report
        // is first filed, and a stale count would contradict Feature 8.
        const counts = await labourCountsFor(report.siteId._id ?? report.siteId, report.date);
        report.labourPresent = counts.labourPresent;
        report.labourAbsent = counts.labourAbsent;
        report.lastEditedBy = req.user._id;

        await report.save();

        return res.status(200).json({
            message: "Report updated",
            attendanceMarked: counts.marked > 0,
            report,
        });

    } catch (error) {
        console.error("updateReport error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
