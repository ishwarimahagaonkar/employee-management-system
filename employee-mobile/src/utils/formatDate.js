// Date formatting for display, built so it can never throw.
//
// Records store dates as plain "YYYY-MM-DD" strings. A missing or malformed
// value produces an Invalid Date, and Intl's formatter raises a RangeError on
// those rather than returning "Invalid Date" -- engine-dependent behaviour that
// differs between the debug bundle and Hermes on a phone. A throw inside render
// takes the whole screen down, so every date shown goes through here instead of
// calling toLocaleDateString directly.
//
// Days are read in UTC because the stored value is a calendar date, not an
// instant: formatting it in a behind-UTC timezone would shift it a day back.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Accepts "YYYY-MM-DD" or a full ISO timestamp; returns null for anything that
// isn't a real date, so callers render a placeholder instead of crashing.
const parseUTC = (value) => {
  if (!value) return null;

  const raw = typeof value === "string" ? value : String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(dateOnly ? `${raw}T00:00:00Z` : raw);

  return isNaN(date.getTime()) ? null : date;
};

const pad2 = (n) => String(n).padStart(2, "0");

// "Thu, Jan 01" -- and with year, "Thu, Jan 01, 2026".
export const formatDateWithWeekday = (value, { withYear = false } = {}) => {
  const date = parseUTC(value);
  if (!date) return "-";

  const base = `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${pad2(date.getUTCDate())}`;
  return withYear ? `${base}, ${date.getUTCFullYear()}` : base;
};

// "Jan 01, 2026"
export const formatDateShort = (value) => {
  const date = parseUTC(value);
  if (!date) return "-";

  return `${MONTHS[date.getUTCMonth()]} ${pad2(date.getUTCDate())}, ${date.getUTCFullYear()}`;
};
