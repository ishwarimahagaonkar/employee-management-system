const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        empID: {
            type: String,
            required: true,
            // Unique per company, not globally (see compound index below) --
            // different companies may reuse ids like "EMP001".
        },
        fullName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true, // global: email is the login identifier
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["superadmin", "admin", "employee"],
            default: "employee",
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        department: String,

        designation: String,

        // Employee's joining date, stored as "YYYY-MM-DD".
        joiningDate: String,

        // Per-hour pay rate used for payroll / salary-slip calculations.
        hourlyRate: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Admins can deactivate an employee; blocks login and invalidates
        // any live token (checked in the protect middleware).
        isActive: {
            type: Boolean,
            default: true,
        },

        // Bumped on logout / deactivation / password change to revoke all
        // previously issued JWTs. The value is embedded in each token and
        // must match on every request.
        tokenVersion: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// empID is unique within a company (not globally). Run
// scripts/fixUserIndexes.js once to drop the old global empID_1 index.
userSchema.index({ companyId: 1, empID: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);