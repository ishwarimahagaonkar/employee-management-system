const LabourAttendance = require("../models/LabourAttendance");
const Labour = require("../models/Labour");
const Site = require("../models/Site");
const { ROLES } = require("../config/roles");

// Calendar dates are Asia/Kolkata everywhere in this system (see
// attendanceController), so "today" must be resolved the same way here.
const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A Mongoose ref is an ObjectId until something populates it, after which it's
// a document. Comparing the raw value therefore works in one code path and
// silently fails in the other, so every ref comparison here goes through this.
const idOf = (ref) => String(ref?._id ?? ref ?? "");


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
 * typing it. After that the record is settled, so a past day can't be quietly
 * rewritten once it has been reported on.
 *
 * There is deliberately no admin override any more: labour:attendance is
 * supervisor-only, so an admin never reaches this code at all. The previous
 * `role === ADMIN` bypass here was dead once the route guard changed, and
 * leaving it would have suggested a correction path that does not exist.
 * The accepted trade is that a wrong entry on a settled day now stands.
 */
const canEditRecord = (record, user) => {
    const createdOn = new Date(record.createdAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });

    return createdOn === todayStr();
};


// ==========================
// GET THE DAY'S SHEET (the roster)
// ==========================
// Returns the people ROSTERED to this site on this date -- i.e. those with an
// attendance row -- not every labourer in the company.
//
// This is the heart of the model: labour carries no site, so the only thing
// that says "these people worked here today" is the set of attendance rows.
// An empty roster is the correct answer for a site nobody has been added to
// yet; the app offers "Add Labour" to build it.
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

        const records = await LabourAttendance.find({ siteId: site._id, date })
            .populate("labour", "labourId fullName mobile status");

        const sheet = records
            // A labour record deleted out from under an attendance row would
            // otherwise crash the map; skip rather than serve a broken row.
            .filter((r) => r.labour)
            .map((r) => ({
                labour: {
                    _id: r.labour._id,
                    labourId: r.labour.labourId,
                    fullName: r.labour.fullName,
                    mobile: r.labour.mobile,
                },
                marked: r.marked,
                present: r.present,
                punchIn: r.punchIn,
                punchOut: r.punchOut,
                workingHours: r.workingHours,
                // Tells the app whether to render this row as editable, so a
                // locked day doesn't look editable and then fail on save.
                editable: canEditRecord(r, req.user),
            }))
            .sort((a, b) => a.labour.fullName.localeCompare(b.labour.fullName));

        const markedCount = sheet.filter((row) => row.marked).length;
        const presentCount = sheet.filter((row) => row.marked && row.present).length;

        return res.status(200).json({
            site: { _id: site._id, name: site.name, code: site.code },
            date,
            isToday: date === todayStr(),
            totals: {
                // "labour" is the roster size for this site+date, NOT a
                // company headcount.
                labour: sheet.length,
                marked: markedCount,
                present: presentCount,
                absent: markedCount - presentCount,
                unmarked: sheet.length - markedCount,
            },
            sheet,
        });

    } catch (error) {
        console.error("getSheet error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// ADD LABOUR TO A SITE'S DAY (roster)
// ==========================
// Creates the attendance rows that put people on a site for a date. They start
// unmarked -- present/absent is a separate decision made on the sheet.
exports.addToRoster = async (req, res) => {
    try {
        const { siteId } = req.body;
        const date = req.body.date || todayStr();
        const labourIds = Array.isArray(req.body.labourIds) ? req.body.labourIds : [];

        if (!DATE_PATTERN.test(date)) {
            return res.status(400).json({ message: "Date must look like 2026-08-01" });
        }

        if (date > todayStr()) {
            return res.status(400).json({ message: "You can't build a roster for a future date" });
        }

        if (labourIds.length === 0) {
            return res.status(400).json({ message: "Select at least one labourer" });
        }

        const { site, error, status } = await resolveSite(siteId, req.user, { forWrite: true });
        if (error) {
            return res.status(status).json({ message: error });
        }

        const companyId = req.user.companyId ?? null;

        // Company-wide lookup: labour has no site, so anyone active in the
        // company may be rostered anywhere.
        const labourers = await Labour.find({
            _id: { $in: labourIds.map(String) },
            companyId,
            status: "active",
        }).select("_id fullName");

        if (labourers.length !== labourIds.length) {
            return res.status(400).json({
                message: "One of those labourers isn't active in your company",
            });
        }

        // A labourer works one site per day, which the unique (labour, date)
        // index enforces. Check first so the response can explain the clash
        // instead of surfacing a duplicate-key error.
        const clashes = await LabourAttendance.find({
            labour: { $in: labourers.map((l) => l._id) },
            date,
        }).populate("siteId", "name code");

        const alreadyHere = [];
        const elsewhere = [];

        for (const clash of clashes) {
            if (idOf(clash.siteId) === idOf(site._id)) {
                alreadyHere.push(idOf(clash.labour));
            } else {
                elsewhere.push(clash);
            }
        }

        if (elsewhere.length > 0) {
            const names = labourers
                .filter((l) => elsewhere.some((c) => idOf(c.labour) === idOf(l._id)))
                .map((l) => l.fullName);

            // Supervisors are not told WHICH site -- that would expose a roster
            // they have no access to. Admins and managers see the whole
            // picture, since they can already read every site.
            const canSeeOtherSites = req.user.role !== ROLES.SUPERVISOR;
            const where = canSeeOtherSites
                ? ` at ${elsewhere[0].siteId?.name ?? "another site"}`
                : " at another site";

            return res.status(409).json({
                message: `${names.join(", ")} ${names.length === 1 ? "is" : "are"} already on a roster${where} for ${date}.`,
            });
        }

        // Re-adding someone already on this roster is a no-op, not an error --
        // two supervisors adding the same person shouldn't fail the request.
        const toAdd = labourers.filter((l) => !alreadyHere.includes(idOf(l._id)));

        if (toAdd.length > 0) {
            await LabourAttendance.insertMany(
                toAdd.map((l) => ({
                    companyId,
                    labour: l._id,
                    siteId: site._id,
                    supervisorId: site.supervisorId ?? null,
                    date,
                    marked: false,
                    present: false,
                    punchIn: null,
                    punchOut: null,
                    workingHours: 0,
                    markedBy: req.user._id,
                }))
            );
        }

        return res.status(201).json({
            message: toAdd.length
                ? `${toAdd.length} added to ${site.name} for ${date}`
                : "Those labourers were already on this roster",
            added: toAdd.length,
            skipped: alreadyHere.length,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "One of those labourers was just rostered elsewhere for this date. Reload and try again.",
            });
        }
        console.error("addToRoster error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// REMOVE LABOUR FROM A SITE'S DAY
// ==========================
// For someone added by mistake. Follows the same edit window as marking: once
// a day is settled, only an admin can change who was on it.
exports.removeFromRoster = async (req, res) => {
    try {
        const siteId = req.body.siteId ?? req.query.siteId;
        const labourId = req.body.labourId ?? req.query.labourId;
        const date = req.body.date || req.query.date || todayStr();

        if (!DATE_PATTERN.test(date)) {
            return res.status(400).json({ message: "Date must look like 2026-08-01" });
        }

        if (!labourId) {
            return res.status(400).json({ message: "labourId is required" });
        }

        const { site, error, status } = await resolveSite(siteId, req.user, { forWrite: true });
        if (error) {
            return res.status(status).json({ message: error });
        }

        const record = await LabourAttendance.findOne({
            labour: String(labourId),
            siteId: site._id,
            date,
        }).catch(() => null);

        if (!record) {
            return res.status(404).json({ message: "That labourer isn't on this roster" });
        }

        if (!canEditRecord(record, req.user)) {
            return res.status(403).json({
                message: "This day is closed. Ask an admin to change who was on it.",
            });
        }

        await LabourAttendance.deleteOne({ _id: record._id });

        return res.status(200).json({ message: "Removed from the roster" });

    } catch (error) {
        console.error("removeFromRoster error:", error);
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

        // The roster IS the authorisation: you can only mark someone who has
        // already been added to this site for this date. That is what stops a
        // supervisor marking a labourer who is working somewhere else today,
        // now that labour is no longer tied to a site.
        const existing = await LabourAttendance.find({ siteId: site._id, date })
            .populate("labour", "fullName");

        const existingByLabour = new Map(existing.map((r) => [idOf(r.labour), r]));

        const operations = [];
        const skipped = [];

        for (const entry of entries) {
            const labourKey = String(entry.labourId ?? entry.labour ?? "");
            const prior = existingByLabour.get(labourKey);

            if (!prior) {
                return res.status(400).json({
                    message: "Someone in this sheet isn't on today's roster for this site. Reload and try again.",
                });
            }

            const labourer = prior.labour || { fullName: "That labourer" };

            // Presence is DERIVED from the punches, never taken from the
            // client. A labourer counts as present only once the full shift is
            // recorded -- punched in AND punched out. Anyone on the roster who
            // was never punched in is absent, which is what makes the absent
            // count "everyone rostered who didn't turn up" without needing a
            // separate absent flag the supervisor has to remember to set.
            const punchIn = entry.punchIn || null;
            const punchOut = entry.punchOut || null;

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

            // Punching out without punching in first is not a shift -- it is
            // almost always the supervisor tapping the wrong button, and
            // storing it would produce a row with hours but no start.
            if (punchOut && !punchIn) {
                return res.status(400).json({
                    message: `${labourer.fullName}: punch in before punching out`,
                });
            }

            if (punchIn && punchOut && punchOut <= punchIn) {
                return res.status(400).json({
                    message: `${labourer.fullName}: out-time must be after in-time`,
                });
            }

            const present = Boolean(punchIn && punchOut);

            // A settled record is left exactly as it was rather than failing
            // the whole submission -- one locked row must not block marking
            // the rest of the crew.
            if (!canEditRecord(prior, req.user)) {
                skipped.push(labourer.fullName);
                continue;
            }

            operations.push({
                updateOne: {
                    // Targeted by _id: the row is known to exist, and there is
                    // no upsert here -- marking must never create a roster
                    // entry, or the roster would stop meaning anything.
                    filter: { _id: prior._id },
                    update: {
                        $set: {
                            // Saving IS the act of marking.
                            marked: true,
                            present,
                            // Stored as given, NOT gated on `present`: a
                            // labourer punched in but not yet out is mid-shift,
                            // and blanking their in-time because the shift is
                            // incomplete would erase the only thing recorded
                            // about them so far.
                            punchIn,
                            punchOut,
                            workingHours: LabourAttendance.computeHours(punchIn, punchOut),
                            markedBy: req.user._id,
                        },
                    },
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
        }).catch(() => null);

        if (!labourer) {
            return res.status(404).json({ message: "Labour not found" });
        }

        const filter = { labour: labourer._id };

        // Every labourer is now visible company-wide, so access is decided by
        // the SITES a supervisor runs rather than by the labour record: they
        // see this person's days at their own sites, and nothing from sites
        // they don't run. Admins and managers see the full history.
        if (req.user.role === ROLES.SUPERVISOR) {
            const sites = await Site.find({
                companyId: req.user.companyId ?? null,
                supervisorId: req.user._id,
            }).select("_id");

            filter.siteId = { $in: sites.map((s) => s._id) };
        }

        if (startDate && endDate) {
            if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
                return res.status(400).json({ message: "Dates must look like 2026-08-01" });
            }
            filter.date = { $gte: startDate, $lte: endDate };
        }

        // Populated so the history reads as "which site, which day" -- the
        // whole point of moving the site onto the attendance row.
        const records = await LabourAttendance.find(filter)
            .populate("siteId", "name code")
            .sort({ date: -1 });

        const presentDays = records.filter((r) => r.present).length;
        const totalHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);

        return res.status(200).json({
            labour: {
                _id: labourer._id,
                labourId: labourer.labourId,
                fullName: labourer.fullName,
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
