const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            default: null,
        },

        date: {
            type: String, // format: "YYYY-MM-DD"
            required: true,
        },

        name: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

holidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);
