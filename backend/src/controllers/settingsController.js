const Settings = require("../models/Settings");

// Each company has its own settings document (companyId: null covers
// pre-multi-tenant deployments that never had a company assigned).
const getOrCreateSettings = async (companyId) => {
    const scopedCompanyId = companyId ?? null;
    let settings = await Settings.findOne({ companyId: scopedCompanyId });

    if (!settings) {
        settings = await Settings.create({ companyId: scopedCompanyId });
    }

    return settings;
};

/**
 * @desc Get organization settings
 * @route GET /settings
 * @access Private
 */
exports.getSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings(req.user.companyId);

        // Non-admins get a limited view: office coordinates and company contact
        // details are withheld; they only need policy fields.
        const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

        let data = settings;
        if (!isAdmin) {
            data = {
                companyName: settings.companyName,
                workStartTime: settings.workStartTime,
                workEndTime: settings.workEndTime,
                halfDayHours: settings.halfDayHours,
                paidLeaveAllotment: settings.paidLeaveAllotment,
                enforceGps: settings.enforceGps,
                geofenceRadius: settings.geofenceRadius,
            };
        }

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

/**
 * @desc Update organization settings
 * @route PUT /settings
 * @access Admin
 */
exports.updateSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings(req.user.companyId);

        const allowedFields = [
            "companyName",
            "industry",
            "companyEmail",
            "companyPhone",
            "companyAddress",
            "officeLat",
            "officeLng",
            "geofenceRadius",
            "enforceGps",
            "workStartTime",
            "workEndTime",
            "halfDayHours",
            "paidLeaveAllotment",
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        });

        await settings.save();

        res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            data: settings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
