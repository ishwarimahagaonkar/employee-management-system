const Settings = require("../models/Settings");

// A single settings document represents the whole organization's config.
const getOrCreateSettings = async () => {
    let settings = await Settings.findOne();

    if (!settings) {
        settings = await Settings.create({});
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
        const settings = await getOrCreateSettings();

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
        const settings = await getOrCreateSettings();

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
            "lateThresholdMinutes",
            "halfDayHours",
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
