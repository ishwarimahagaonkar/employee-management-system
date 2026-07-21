// Default national holiday list seeded for every company.
// Only fixed-date holidays are included -- movable festivals (Diwali, Holi, Eid, etc.)
// change every year, so admins add those themselves from the Holidays screen.
const FIXED_HOLIDAYS = [
    { month: "01", day: "01", name: "New Year's Day" },
    { month: "01", day: "26", name: "Republic Day" },
    { month: "05", day: "01", name: "Labour Day" },
    { month: "08", day: "15", name: "Independence Day" },
    { month: "10", day: "02", name: "Gandhi Jayanti" },
    { month: "12", day: "25", name: "Christmas Day" },
];

// Returns [{ date: "YYYY-MM-DD", name }] for the given year.
function defaultHolidaysForYear(year) {
    return FIXED_HOLIDAYS.map((h) => ({
        date: `${year}-${h.month}-${h.day}`,
        name: h.name,
    }));
}

module.exports = { defaultHolidaysForYear };
