const Holiday = require("../models/Holiday");
const Settings = require("../models/Settings");
const { defaultHolidaysForYear } = require("../utils/defaultHolidays");

// Auto-seeds the current year's default national holidays the first time a
// company's holidays are fetched each year. The seeded year is recorded in
// Settings so defaults an admin deliberately deleted are never re-added.
async function ensureDefaultHolidays(companyId) {
    const currentYear = new Date().getFullYear();

    const settings = await Settings.findOneAndUpdate(
        { companyId },
        { $setOnInsert: { companyId } },
        { new: true, upsert: true }
    );

    if (settings.holidaySeedYear === currentYear) return;

    const defaults = defaultHolidaysForYear(currentYear);
    const dates = defaults.map((h) => h.date);

    const existing = await Holiday.find({ companyId, date: { $in: dates } }).select("date");
    const existingDates = new Set(existing.map((h) => h.date));

    const missing = defaults.filter((h) => !existingDates.has(h.date));
    if (missing.length) {
        await Holiday.insertMany(missing.map((h) => ({ ...h, companyId })));
    }

    settings.holidaySeedYear = currentYear;
    await settings.save();
}

// ==========================
// GET HOLIDAYS (company-scoped, optional ?year=YYYY filter)
// ==========================
exports.getHolidays = async (req, res) => {
    try {
        const { year } = req.query;

        await ensureDefaultHolidays(req.user.companyId ?? null);

        const query = { companyId: req.user.companyId ?? null };
        if (year) {
            query.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
        }

        const holidays = await Holiday.find(query).sort({ date: 1 });

        return res.status(200).json({
            count: holidays.length,
            holidays,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// CREATE HOLIDAY (ADMIN)
// ==========================
exports.createHoliday = async (req, res) => {
    try {
        const { date, name } = req.body;

        if (!date || !name) {
            return res.status(400).json({
                message: "Date and name are required",
            });
        }

        const companyId = req.user.companyId ?? null;

        const existing = await Holiday.findOne({ companyId, date });
        if (existing) {
            return res.status(400).json({
                message: "A holiday is already set for this date",
            });
        }

        const holiday = await Holiday.create({
            companyId,
            date,
            name,
        });

        return res.status(201).json({
            message: "Holiday added successfully",
            holiday,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// DELETE HOLIDAY (ADMIN)
// ==========================
exports.deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday || String(holiday.companyId) !== String(req.user.companyId)) {
            return res.status(404).json({
                message: "Holiday not found",
            });
        }

        await Holiday.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Holiday deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};
