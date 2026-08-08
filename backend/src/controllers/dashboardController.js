const User = require("../models/User");
const Site = require("../models/Site");
const Labour = require("../models/Labour");
const LabourAttendance = require("../models/LabourAttendance");
const DailyWorkReport = require("../models/DailyWorkReport");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const { ROLES, STAFF_ROLES } = require("../config/roles");

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });


/**
 * Staff attendance for today across the company.
 *
 * Counted server-side with countDocuments rather than by pulling every
 * employee and every attendance row to the phone and subtracting. The old
 * client-side sum also counted admins in "total", so once admins stopped
 * punching they showed up as permanently absent.
 */
const staffAttendanceToday = async (companyId) => {
    const date = todayStr();

    const [total, present, late] = await Promise.all([
        // Only roles that actually punch. Deactivated accounts are excluded --
        // they can't attend, so counting them as absent is noise.
        User.countDocuments({
            companyId,
            role: { $in: STAFF_ROLES },
            isActive: { $ne: false },
        }),
        Attendance.countDocuments({
            companyId,
            date,
            status: { $in: ["present", "approved"] },
        }),
        Attendance.countDocuments({ companyId, date, status: "late" }),
    ]);

    return {
        total,
        present,
        late,
        absent: Math.max(total - present - late, 0),
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    };
};


// Approvals waiting on an admin or manager: leave requests plus emergency
// attendance overrides.
const pendingRequests = async (companyId) => {
    const [leaves, emergencies] = await Promise.all([
        Leave.countDocuments({ companyId, status: "Pending" }),
        Attendance.countDocuments({
            companyId,
            emergencyRequest: true,
            status: "pending",
        }),
    ]);

    return { leaves, emergencies, total: leaves + emergencies };
};


// Labour figures for a set of sites on a date.
//
// Everything here is derived from the roster, because labour records no longer
// carry a site: "total" is how many people were put on these sites for this
// date, not a company headcount. Counting Labour by siteId (as this used to)
// would now return zero.
const labourSummary = async (siteIds, date) => {
    const records = await LabourAttendance.find({
        siteId: { $in: siteIds },
        date,
    }).select("marked present punchIn punchOut");

    const marked = records.filter((r) => r.marked).length;
    const present = records.filter((r) => r.marked && r.present).length;

    // Marked present, clocked in, but never clocked out -- the supervisor's
    // outstanding work at the end of a shift.
    const pendingPunchOuts = records.filter(
        (r) => r.present && r.punchIn && !r.punchOut
    ).length;

    return {
        total: records.length,
        marked,
        present,
        absent: marked - present,
        // Rostered but not yet said present or absent -- real outstanding work,
        // rather than the old guess of "labour at the site minus rows written".
        unmarked: records.length - marked,
        pendingPunchOuts,
    };
};


// ==========================
// ROLE DASHBOARD
// ==========================
// One endpoint, three shapes. Each role's payload carries only what its
// screen renders, so no dashboard pulls data it isn't allowed to show.
exports.getDashboard = async (req, res) => {
    try {
        const companyId = req.user.companyId ?? null;
        const date = todayStr();

        // ---------- SUPERVISOR ----------
        if (req.user.role === ROLES.SUPERVISOR) {
            const sites = await Site.find({
                companyId,
                supervisorId: req.user._id,
            }).select("_id name code status");

            const siteIds = sites.map((s) => s._id);
            const activeSites = sites.filter((s) => s.status === "active");

            const [labour, reportsToday] = await Promise.all([
                labourSummary(siteIds, date),
                DailyWorkReport.countDocuments({ siteId: { $in: siteIds }, date }),
            ]);

            return res.status(200).json({
                role: ROLES.SUPERVISOR,
                date,
                sites: {
                    total: sites.length,
                    active: activeSites.length,
                },
                labour,
                todayReport: {
                    submitted: reportsToday,
                    // Only active sites are expected to file a report, so an
                    // inactive site can't leave this permanently incomplete.
                    expected: activeSites.length,
                    complete: activeSites.length > 0 && reportsToday >= activeSites.length,
                },
            });
        }

        // ---------- ADMIN AND MANAGER ----------
        // Manager scope is company-wide (as agreed), so both read the same
        // figures; the screens differ in what they offer to do next.
        const [
            employees,
            managers,
            supervisors,
            sites,
            labourTotal,
            attendance,
            requests,
        ] = await Promise.all([
            User.countDocuments({ companyId, role: ROLES.EMPLOYEE, isActive: { $ne: false } }),
            User.countDocuments({ companyId, role: ROLES.MANAGER, isActive: { $ne: false } }),
            User.countDocuments({ companyId, role: ROLES.SUPERVISOR, isActive: { $ne: false } }),
            Site.countDocuments({ companyId, status: "active" }),
            Labour.countDocuments({ companyId, status: "active" }),
            staffAttendanceToday(companyId),
            pendingRequests(companyId),
        ]);

        // Labour attendance is scoped by site, so the company's sites are
        // resolved once and reused.
        const companySites = await Site.find({ companyId }).select("_id");
        const labour = await labourSummary(companySites.map((s) => s._id), date);

        const reportsToday = await DailyWorkReport.countDocuments({
            companyId,
            date,
        });

        return res.status(200).json({
            role: req.user.role,
            date,
            counts: {
                employees,
                managers,
                supervisors,
                sites,
                labour: labourTotal,
            },
            attendance,
            labour,
            pendingRequests: requests,
            todayReport: {
                submitted: reportsToday,
                expected: sites,
                complete: sites > 0 && reportsToday >= sites,
            },
        });

    } catch (error) {
        console.error("getDashboard error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
