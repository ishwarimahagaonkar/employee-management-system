/**
 * Resolves the time an action actually happened, for endpoints that may be
 * replayed from a client's offline queue.
 *
 * Every timestamp in this system used to be server-assigned (`new Date()` at
 * the moment the request arrived). That is correct while the app is online and
 * badly wrong once it is not: a punch queued at 09:00 and synced at 18:00 would
 * record 18:00, which is worse than losing it -- it looks right and quietly
 * corrupts nine hours of payroll.
 *
 * Callers now pass the client's `capturedAt` and get back both the real time
 * and whether it arrived late. Omitting it reproduces the old behaviour
 * exactly, so an app that has not been updated keeps working unchanged.
 *
 * TRUST MODEL -- read before widening any of this.
 * Accepting a client time means the device asserts when it happened, and a
 * device clock can be changed. The limits below are what keep that bounded:
 *
 *   - not in the future beyond a small skew allowance, so a fast clock cannot
 *     book time that has not happened yet;
 *   - the same Asia/Kolkata calendar day as the server, so nobody can
 *     fabricate a day they never showed up for. This is a calendar-day rule
 *     rather than an hours-based one because attendance is already keyed by
 *     "YYYY-MM-DD" -- it also means the derived date is identical whichever
 *     clock you read, so no caller has to change how it computes the date.
 *
 * Anything older is refused here on purpose. The existing emergency-request
 * flow (out-of-geofence punches) is the escape hatch for a genuinely missed
 * day, and it already routes through an admin.
 */

// A phone's clock is rarely exact. Two minutes absorbs ordinary drift without
// allowing a meaningful amount of invented time.
const FUTURE_SKEW_MS = 2 * 60 * 1000;

// Below this the request is simply a live one that happened to include the
// field; above it, it genuinely sat in a queue and is worth flagging.
const OFFLINE_AFTER_MS = 2 * 60 * 1000;

const IST = { timeZone: "Asia/Kolkata" };

const dayOf = (date) => date.toLocaleDateString("en-CA", IST);

/**
 * @param {*} raw          value from req.body.capturedAt (may be absent)
 * @param {Date} now       injected for testing; defaults to real now
 * @returns {{ at: Date, receivedAt: Date, offline: boolean } | { error: string }}
 */
function resolveCapturedAt(raw, now = new Date()) {
    // Not supplied: behave exactly as before offline support existed.
    if (raw === undefined || raw === null || raw === "") {
        return { at: now, receivedAt: now, offline: false };
    }

    const at = new Date(raw);

    if (Number.isNaN(at.getTime())) {
        return { error: "capturedAt is not a valid date" };
    }

    if (at.getTime() - now.getTime() > FUTURE_SKEW_MS) {
        return { error: "capturedAt is in the future. Check your device's clock." };
    }

    if (dayOf(at) !== dayOf(now)) {
        return {
            error:
                "This was recorded on a different day and can no longer be submitted. " +
                "Ask your admin to add it.",
        };
    }

    // A clock running slightly fast lands a few seconds ahead; treat that as
    // now rather than as a negative delay.
    const settled = at.getTime() > now.getTime() ? now : at;

    return {
        at: settled,
        receivedAt: now,
        offline: now.getTime() - settled.getTime() > OFFLINE_AFTER_MS,
    };
}

module.exports = {
    resolveCapturedAt,
    FUTURE_SKEW_MS,
    OFFLINE_AFTER_MS,
};
