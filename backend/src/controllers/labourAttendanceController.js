const LabourAttendance = require("../models/LabourAttendance");
const Labour = require("../models/Labour");
const Site = require("../models/Site");
const { ROLES } = require("../config/roles");

// Calendar dates are Asia/Kolkata everywhere in this system (see
// attendanceController), so "today" must be resolved the same way here.
const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;


/**
 * Loads a site the user may mark or read attendance for.
 * Returns { site } or { error, status }.
 */
const resolveSite = async (siteId, user, { forWrite }) => {
    if (!siteId) return { error: "Site is required", status: 400 };

    const site = await Site.findOne({
        _id: String(siteId),
        companyId: user.companyId ?? null,
    }).catch(() => null);

    if (!site) return { error: "Site not found", status: 404 };

    // A supervisor is confined to the sites they run, for reading as well as
    // writing. Admins and managers see the whole company.
    if (
        user.role === ROLES.SUPERVISOR &&
        String(site.supervisorId ?? "") !== String(user._id)
    ) {
        return {
            error: forWrite
                ? "You can only mark attendance for sites assigned to you"
                : "You can only view attendance for sites assigned to you",
            status: 403,
        };
    }

    return { site };
};


/**
 * Whether this user may still change an existing record.
 *
 * Supervisors get the calendar day they entered it -- which covers marking
 * today's sheet through the day, and fixing a backfilled entry right after
 * typing it. After that the record is settled and only an admin can touch it,
 * so a past day can't be quietly rewritten once it has been reported on.
 */
const canEditRecord = (record, user) => {
    if (user.role === ROLES.ADMIN) return true;

    const createdOn = new Date(record.createdAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });

    return createdOn === todayStr();
};


// ==========================
// GET THE DAY'S SHEET
// ==========================
// Returns every active labourer at the site alongside their record for that
// date (null when unmarked), so the app can render the whole sheet in one
// pass instead of stitching two lists together.
exports.getSheet = async (req, res) => {
    try {
        const { siteId } = req.query;
        const date = req.query.date || todayStr();

        if (!DATE_PATTERN.test(date)) {
            return res.status(400).json({ message: "Date must look like 2026-08-01" });
        }

        const { site, error, status } = await resolveSite(siteId, req.user, { forWrite: false });
        if (error) {
            return res.status(status).json({ message: error });
        }

        const labourers = await Labour.find({
            siteId: site._id,
            companyId: req.user.companyId ?? null,
            status: "active",
        }).select("labourId fullName mobile").sort({ fullName: 1 });

        const records = await LabourAttendance.find({
            siteId: site._id,
            date,
        });

        const byLabour = new Map(records.map((r) => [String(r.labour), r]));

        const sheet = labourers.map((l) => {
            const record = byLabour.get(String(l._id));

            return {
                labour: {
                    _id: l._id,
                    labourId: l.labourId,
                    fullName: l.fullName,
                    mobile: l.mobile,
                },
                marked: !!record,
                present: record ? record.present : false,
                punchIn: record ? record.punchIn : null,
                punchOut: record ? record.punchOut : null,
                workingHours: record ? record.workingHours : 0,
                // Tells the app whether to render this row as editable, so a
                // locked day doesn't look editable and then fail on save.
                editable: record ? canEditRecord(record, req.user) : true,
            };
        });

        const presentCount = sheet.filter((row) => row.present).length;
        const markedCount = sheet.filter((row) => row.marked).length;

        return res.status(200).json({
            site: { _id: site._id, name: site.name, code: site.code },
            date,
            isToday: date === todayStr(),
            totals: {
                labour: sheet.length,
                marked: markedCount,
                present: presentCount,
                absent: markedCount - presentCount,
            },
            sheet,
        });

    } catch (error) {
        console.error("getSheet error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// SAVE THE DAY'S SHEET
// ==========================
// Takes the whole crew in one request, because that is how the sheet is
// actually filled in. Re-submitting the same day updates rather than
// duplicating -- the unique (labour, date) index guarantees it.
exports.saveSheet = async (req, res) => {
    try {
        const { siteId, entries } = req.body;
        const date = req.body.date || todayStr();

        if (!DATE_PATTERN.test(date)) {
            return res.status(400).json({ message: "Date must look like 2026-08-01" });
        }

        // Backdating is allowed; recording attendance that hasn't happened yet
        // is not.
        if (date > todayStr()) {
            return res.status(400).json({ message: "You can't mark attendance for a future date" });
        }

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ message: "No attendance entries were sent" });
        }

        const { site, error, status } = await resolveSite(siteId, req.user, { forWrite: true });
        if (error) {
            return res.status(status).json({ message: error });
        }

        // Everything the request refers to must be active labour at THIS site,
        // otherwise a supervisor could mark attendance for another site's crew.
        const labourers = await Labour.find({
            siteId: site._id,
            companyId: req.user.companyId ?? null,
            status: "active",
        }).select("_id fullName");

        const allowed = new Map(labourers.map((l) => [String(l._id), l]));

        const existing = await LabourAttendance.find({ siteId: site._id, date });
        const existingByLabour = new Map(existing.map((r) => [String(r.labour), r]));

        const operations = [];
        const skipped = [];

        for (const entry of entries) {
            const labourKey = String(entry.labourId ?? entry.labour ?? "");
            const labourer = allowed.get(labourKey);

            if (!labourer) {
                return res.status(400).json({
                    message: "One of the entries isn't active labour at this site",
                });
            }

            const present = entry.present === true;
            let punchIn = null;
            let punchOut = null;

            if (present) {
                punchIn = entry.punchIn ?? null;
                punchOut = entry.punchOut ?? null;

                // Times are optional while a shift is still running -- a
                // supervisor marks people in first and fills the out time later.
                if (punchIn !== null && !LabourAttendance.isValidTime(punchIn)) {
                    return res.status(400).json({
                        message: `${labourer.fullName}: in-time must look like 09:00`,
                    });
                }

                if (punchOut !== null && !LabourAttendance.isValidTime(punchOut)) {
                    return res.status(400).json({
                        message: `${labourer.fullName}: out-time must look like 18:00`,
                    });
                }

                if (punchIn && punchOut && punchOut <= punchIn) {
                    return res.status(400).json({
                        message: `${labourer.fullName}: out-time must be after in-time`,
                    });
                }
            }

            const prior = existingByLabour.get(labourKey);

            // A settled record is left exactly as it was rather than failing
            // the whole submission -- one locked row must not block marking
            // the rest of the crew.
            if (prior && !canEditRecord(prior, req.user)) {
                skipped.push(labourer.fullName);
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { labour: labourer._id, date },
                    update: {
                        $set: {
                            present,
                            punchIn: present ? punchIn : null,
                            punchOut: present ? punchOut : null,
                            workingHours: present
                                ? LabourAttendance.computeHours(punchIn, punchOut)
                                : 0,
                            siteId: site._id,
                            companyId: req.user.companyId ?? null,
                            supervisorId: site.supervisorId ?? null,
                            markedBy: req.user._id,
                        },
                    },
                    upsert: true,
                },
            });
        }

        if (operations.length > 0) {
            await LabourAttendance.bulkWrite(operations);
        }

        return res.status(200).json({
            message: skipped.length
                ? `Attendance saved. ${skipped.length} record(s) were already locked and left unchanged.`
                : "Attendance saved",
            saved: operations.length,
            skipped,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "That attendance was just saved by someone else. Reload the sheet and try again.",
            });
        }
        console.error("saveSheet error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// ONE LABOURER'S HISTORY
// ==========================
exports.getLabourHistory = async (req, res) => {
    try {
        const { labourId, startDate, endDate } = req.query;

        if (!labourId) {
            return res.status(400).json({ message: "labourId is required" });
        }

        const labourer = await Labour.findOne({
            _id: String(labourId),
            companyId: req.user.companyId ?? null,
        }).populate("siteId", "name code supervisorId").catch(() => null);

        if (!labourer) {
            return res.status(404).json({ message: "Labour not found" });
        }

        // Supervisors only see labour on their own sites.
        if (
            req.user.role === ROLES.SUPERVISOR &&
            String(labourer.siteId?.supervisorId ?? "") !== String(req.user._id)
        ) {
            return res.status(403).json({
                message: "You can only view labour on sites assigned to you",
            });
        }

        const filter = { labour: labourer._id };

        if (startDate && endDate) {
            if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
                return res.status(400).json({ message: "Dates must look like 2026-08-01" });
            }
            filter.date = { $gte: startDate, $lte: endDate };
        }

        const records = await LabourAttendance.find(filter).sort({ date: -1 });

        const presentDays = records.filter((r) => r.present).length;
        const totalHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);

        return res.status(200).json({
            labour: {
                _id: labourer._id,
                labourId: labourer.labourId,
                fullName: labourer.fullName,
                site: labourer.siteId,
            },
            totals: {
                days: records.length,
                present: presentDays,
                absent: records.length - presentDays,
                hours: Number(totalHours.toFixed(2)),
            },
            records,
        });

    } catch (error) {
        console.error("getLabourHistory error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
