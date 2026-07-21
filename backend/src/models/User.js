const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        empID: {
            type: String,
            required: true,
            unique: true,
        },
        fullName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
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
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);