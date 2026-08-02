const mongoose = require("mongoose");
const { ALL_ROLES } = require("../config/roles");

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

        // "manager" and "supervisor" were added alongside the existing values,
        // so every account created before this change keeps working untouched.
        // See config/roles.js for what each one may do.
        role: {
            type: String,
            enum: ALL_ROLES,
            default: "employee",
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        // Reporting line, used by "Assign Managers" / "Assign Supervisors".
        // Null on every existing account and on anyone who reports to nobody;
        // read access is company-wide, so this records the relationship rather
        // than restricting what its holder can see.
        managerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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