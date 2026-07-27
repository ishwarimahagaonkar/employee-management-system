// Resolves a month param (number "7"/"07", or name "july"/"jul") to a
// zero-padded "01".."12", or null if it can't be understood.
const MONTHS_LONG = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"];

function resolveMonthNumber(month) {
    if (month === undefined || month === null) return null;

    const raw = String(month).trim().toLowerCase();

    // Numeric form
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1 && num <= 12 && /^\d+$/.test(raw)) {
        return String(num).padStart(2, "0");
    }

    // Name form
    let idx = MONTHS_LONG.indexOf(raw);
    if (idx === -1) idx = MONTHS_SHORT.indexOf(raw);
    if (idx !== -1) return String(idx + 1).padStart(2, "0");

    return null;
}

// Returns { gte, lte } inclusive "YYYY-MM-DD" string bounds for the month, or
// null if month/year are invalid. Upper bound "-31" is safe for string range
// comparison even in shorter months (no real date sorts above it).
function monthDateRange(month, year) {
    const mm = resolveMonthNumber(month);
    const y = parseInt(year, 10);
    if (!mm || isNaN(y) || String(year).length !== 4) return null;

    return { gte: `${y}-${mm}-01`, lte: `${y}-${mm}-31` };
}

module.exports = { resolveMonthNumber, monthDateRange };
