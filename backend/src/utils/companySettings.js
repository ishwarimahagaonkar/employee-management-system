const Settings = require("../models/Settings");
const Company = require("../models/Company");

/**
 * The one place a company's settings document is created.
 *
 * Settings are created lazily -- the first punch, or the first visit to the
 * settings screen, brings the row into existence. Nothing filled in the
 * company's own name when that happened, so the schema defaults stood, and
 * those defaults were a real company's name and address. Every tenant on the
 * platform therefore displayed "Obsidian.dev" until an admin noticed and
 * edited it by hand.
 *
 * Seeding from the Company record fixes that at the source: whoever creates
 * the row first, it carries the right name.
 *
 * Two behaviours worth preserving if this is ever rewritten:
 *
 *   - The write is a single atomic upsert, not findOne-then-create. Those two
 *     statements are not atomic and this runs on EVERY punch, which is the
 *     widest concurrency exposure in the system; two employees punching in at
 *     a new company could each create a settings row, after which every read
 *     returned an arbitrary one of the two.
 *   - $setOnInsert, never $set. An admin who changes the geofence or the
 *     company name must not have it silently reset by the next punch.
 */
async function getOrCreateCompanySettings(companyId) {
    const scoped = companyId ?? null;

    // Fast path. Settings exist for all but the first call, and this keeps the
    // Company lookup below off the punch path in the normal case.
    const existing = await Settings.findOne({ companyId: scoped });
    if (existing) return existing;

    const seed = { companyId: scoped };

    if (scoped) {
        const company = await Company.findById(scoped)
            .select("name email")
            .lean()
            .catch(() => null);

        // Left empty rather than guessed when the company cannot be read. An
        // empty name renders as nothing; a wrong one is what caused this bug.
        if (company?.name) seed.companyName = company.name;
        if (company?.email) seed.companyEmail = company.email;
    }

    try {
        return await Settings.findOneAndUpdate(
            { companyId: scoped },
            { $setOnInsert: seed },
            { returnDocument: "after", upsert: true }
        );
    } catch (err) {
        // Lost a genuinely simultaneous upsert to the unique index on
        // companyId. That only happens because the other request just created
        // the row, so reading it is the right answer rather than failing.
        if (err.code === 11000) {
            return Settings.findOne({ companyId: scoped });
        }
        throw err;
    }
}

module.exports = { getOrCreateCompanySettings };
