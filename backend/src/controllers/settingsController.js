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

        res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
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
            message: error.message,
        });
    }
};
