const mongoose = require("mongoose");

// A labourer on the company's master list.
//
// Labour is NOT a system user: there is no email, no password and no role, and
// these records never authenticate. They exist purely so attendance can be
// tracked against them. That is why this is its own collection rather than
// another role on User.
//
// There is deliberately NO siteId here. A labourer belongs to the company, not
// to a site: the site they worked on a given day is recorded on that day's
// LabourAttendance row instead. That is what lets the same person work Site A
// on Monday and Site B on Tuesday without ever duplicating this record, and it
// means site history is derived from attendance rather than from overwriting a
// field (which would silently rewrite the past).
//
// No government ID is stored. Aadhaar was dropped from the design deliberately
// -- nothing here needs it, and not holding it is the safer default.

const labourSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        // Typed in by the supervisor and unique within the company.
        labourId: {
            type: String,
            required: true,
            trim: true,
        },

        // Uppercased copy of labourId, so "abc-1" and "ABC-1" can't both exist
        // as separate people. The unique index is built on this, not the raw
        // value the supervisor typed.
        labourIdKey: {
            type: String,
            required: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        // Optional: recorded when the labourer actually has a phone.
        mobile: {
            type: String,
            default: "",
            trim: true,
        },

        // Digits-only copy of `mobile`, so "98765 43210", "98765-43210" and
        // "9876543210" are recognised as the same number. Left unset when no
        // mobile was given -- the unique index below skips those rows entirely,
        // which is what lets many labourers share "no phone".
        mobileKey: {
            type: String,
            default: undefined,
        },

        address: {
            type: String,
            default: "",
            trim: true,
        },

        // Labour is deactivated rather than deleted: attendance history points
        // at these records and must never be orphaned.
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Digits-only comparison key for a mobile number.
 *
 * Strips punctuation, then keeps the last 10 digits when there are more, so a
 * number saved as "+91 98765 43210", "098765 43210" and "9876543210" all
 * resolve to the same person. Without that, the duplicate check misses the
 * most common way the same labourer gets registered twice.
 *
 * Returns undefined when there is no usable number, which keeps the row out of
 * the partial unique index below.
 *
 * NOTE: the last-10 rule assumes 10-digit local numbers. Two genuinely
 * different international numbers sharing their final 10 digits would be
 * treated as one person -- vanishingly unlikely here, and the trade is worth
 * it to catch real duplicates.
 */
labourSchema.statics.mobileKeyOf = function (mobile) {
    const digits = String(mobile || "").replace(/\D/g, "");
    if (!digits) return undefined;

    return digits.length > 10 ? digits.slice(-10) : digits;
};

// Normalisation lives on the model so no caller can write an unnormalised key
// and slip past the unique indexes.
//
// Declared with no `next` parameter: Mongoose 9 treats document middleware as
// promise-based, and taking a callback throws at runtime.
// Runs on validate/save only -- controllers must load-modify-save rather than
// use findOneAndUpdate, or these keys go stale.
labourSchema.pre("validate", function () {
    if (typeof this.labourId === "string") {
        this.labourId = this.labourId.trim();
        this.labourIdKey = this.labourId.toUpperCase();
    }

    if (typeof this.mobile === "string") {
        this.mobile = this.mobile.trim();
        // Unset rather than empty-string: the partial index below keys off the
        // field being a string, so a phone-less record must not be indexed.
        this.mobileKey = this.constructor.mobileKeyOf(this.mobile);
    }
});

// Labour ID is unique within a company (not globally -- two companies may each
// run their own numbering).
labourSchema.index({ companyId: 1, labourIdKey: 1 }, { unique: true });

// Mobile numbers are unique too, but only among records that actually have
// one. A plain compound unique index would treat every phone-less labourer as
// a duplicate of the last; the partial filter excludes them.
labourSchema.index(
    { companyId: 1, mobileKey: 1 },
    { unique: true, partialFilterExpression: { mobileKey: { $type: "string" } } }
);

// The master list is browsed and searched company-wide, not per site.
labourSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("Labour", labourSchema);
