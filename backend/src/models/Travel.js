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

            // The real trip times -- when a start or end is replayed from the
            // client's offline queue these hold when it actually happened, not
            // when the server received it. Distance and duration read these.
            startTime: Date,
            endTime: Date,

            // When the server received each, and whether it came off the
            // offline queue. See utils/capturedAt.js.
            startReceivedAt: { type: Date, default: null },
            endReceivedAt: { type: Date, default: null },
            startOffline: { type: Boolean, default: false },
            endOffline: { type: Boolean, default: false },

            // Client-generated id for the request that created this trip.
            //
            // Unlike attendance, a trip has no natural unique key -- an
            // employee may legitimately make several in a day -- so a replayed
            // "start trip" would otherwise create a second one. Matching on
            // this makes the replay a no-op instead. Absent on trips created
            // by an app that predates offline support.
            clientRequestId: { type: String, default: null },

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

            // How distanceKm was computed:
            //   gps        — summed from the recorded background GPS route (most accurate)
            //   road       — routed road distance between start and end (OSRM)
            //   straight   — straight-line fallback
            //   unrecorded — the trip was never ended, so there is no end
            //                location and no distance can be derived. Closed by
            //                scripts/repairStuckTrips.js. distanceKm is 0 and
            //                must NOT be treated as "travelled nothing" for
            //                reimbursement -- it means "unknown".
            distanceSource: {
                type: String,
                enum: ["gps", "road", "straight", "unrecorded"],
                default: "straight"
            },

            // Thinned GPS route recorded during the trip (empty when
            // background tracking was unavailable). Excluded from list
            // endpoints via .select("-trips.route").
            route: [
                {
                    _id: false,
                    lat: Number,
                    lng: Number,
                    t: Number
                }
            ],

            durationMin: {
                type: Number,
                default: 0
            },

            // Employees traveling with the trip creator. They are only linked
            // to this trip -- they record no start/end/distance of their own and
            // receive no km / reimbursement.
            coTravelers: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                }
            ],

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

// Per-user daily lookup (findOne by userId+date) and history.
travelSchema.index({ userId: 1, date: 1 });
// Admin list of a company's travel by date.
travelSchema.index({ companyId: 1, date: -1 });

module.exports = mongoose.model("Travel", travelSchema);