const mongoose = require("mongoose");

// A work site owned by one company and run by one supervisor.
//
// Site names and codes are unique WITHIN a company, never globally: two
// customers may each legitimately have an "ABC Construction", and a global
// rule would let one company block another's name (and reveal that it exists).
// Same reasoning as the empID index on User.

const siteSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Lower-cased, whitespace-collapsed copy of `name`, kept only so the
        // unique index can be case-insensitive. Without it "ABC Construction",
        // "abc construction" and "ABC  Construction" would all be accepted as
        // different sites, which is exactly what the rule is meant to stop.
        nameKey: {
            type: String,
            required: true,
        },

        // Typed in by the person creating the site. Uppercased on save, so
        // comparisons and the unique index need no extra normalisation.
        code: {
            type: String,
            required: true,
            trim: true,
        },

        // Free-text address, entered by the supervisor.
        location: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },

        // One supervisor runs a site; a supervisor may run several. Nullable so
        // a site survives its supervisor being deactivated or reassigned.
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Sites are deactivated rather than deleted -- labour records and
        // attendance history point at them and must not be orphaned.
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

// Normalisation lives on the model rather than in the controller so no future
// caller can write an unnormalised name and slip past the unique index.
//
// NOTE 1: this runs on validate/save, not on findOneAndUpdate -- controllers
// must load-modify-save rather than use the atomic update helpers.
// NOTE 2: declared with no `next` parameter. Mongoose 9 treats document
// middleware as promise-based; taking a `next` callback throws at runtime.
siteSchema.pre("validate", function () {
    if (typeof this.name === "string") {
        this.name = this.name.trim().replace(/\s+/g, " ");
        this.nameKey = this.name.toLowerCase();
    }

    if (typeof this.code === "string") {
        this.code = this.code.trim().toUpperCase();
    }
});

// Both uniqueness rules are enforced by the database, not just by the
// controller's pre-check: two simultaneous requests can both pass a check and
// only the index will stop the second one.
siteSchema.index({ companyId: 1, nameKey: 1 }, { unique: true });
siteSchema.index({ companyId: 1, code: 1 }, { unique: true });

// Supervisors list "my sites" on every screen they open.
siteSchema.index({ companyId: 1, supervisorId: 1 });

module.exports = mongoose.model("Site", siteSchema);
