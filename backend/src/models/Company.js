const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        contactPerson: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        phone: String,

        address: String,

        subscription: {
            plan: {
                type: String,
                enum: ["Standard", "Premium"],
                default: "Premium",
            },
            status: {
                type: String,
                enum: ["active", "trial", "suspended", "expired"],
                default: "trial",
            },
            startDate: Date,
            endDate: Date,
            employeeLimit: {
                type: Number,
                default: 10,
            },
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Company", companySchema);
