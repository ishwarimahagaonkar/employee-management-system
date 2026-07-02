const mongoose = require("mongoose");

const travelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
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