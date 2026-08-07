const Settings = require("../models/Settings");

// Each company has its own settings document (companyId: null covers
// pre-multi-tenant deployments that never had a company assigned).
// Upserted in one statement: findOne-then-create is not atomic, and two
// requests arriving together could each miss the findOne and each create a
// settings document. Every later read would then return an arbitrary one of
// them, so an admin's saved change would seem to apply intermittently.
//
// A simultaneous upsert can still lose to the unique index on companyId. That
// only happens because the other request just created the row, so the right
// response is to read it, not to fail.
const getOrCreateSettings = async (companyId) => {
    const scopedCompanyId = companyId ?? null;

    try {
        return await Settings.findOneAndUpdate(
            { companyId: scopedCompanyId },
            { $setOnInsert: { companyId: scopedCompanyId } },
            { returnDocument: "after", upsert: true }
        );
    } catch (err) {
        if (err.code === 11000) {
            return await Settings.findOne({ companyId: scopedCompanyId });
        }
        throw err;
    }
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
