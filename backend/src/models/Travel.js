const mongoose = require("mongoose");

const travelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null
    },

    date: {
        type: String, // format: "2026-06-27"
        required: true
    },

    trips: [
        {
            purpose: String,
            startTime: Date,
            endTime: Date,

            startLocation: {
                lat: Number,
                lng: Number,
                address: String
            },

            endLocation: {
                lat: Number,
                lng: Number,
                address: String
            },

            distanceKm: {
                type: Number,
                default: 0
            },

            durationMin: {
                type: Number,
                default: 0
            },

            meetingDetails: {
                customerName: String,
                meetingStartTime: String,
                meetingEndTime: String,
                notes: String
            }
        }
    ],

    totalTrips: {
        type: Number,
        default: 0
    },

    totalDistanceKm: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Travel", travelSchema);