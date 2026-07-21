const Travel = require("../models/Travel");

/* =========================
   Haversine Distance (KM)
========================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/* =========================
   GET TODAY DATE (Asia/Kolkata)
========================= */
function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/* =========================
   START TRIP (TOKEN BASED)
========================= */
exports.startTrip = async (req, res) => {
    try {
        const userId = req.user._id; // 🔥 FROM TOKEN
        const { purpose, lat, lng, address } = req.body;

        const date = getTodayDate();

        let travel = await Travel.findOne({ userId, date });

        if (!travel) {
            travel = new Travel({
                userId,
                companyId: req.user.companyId,
                date,
                trips: []
            });
        }

        // prevent multiple active trips
        const lastTrip = travel.trips[travel.trips.length - 1];
        if (lastTrip && !lastTrip.endTime) {
            return res.status(400).json({
                success: false,
                message: "Trip already in progress"
            });
        }

        // Today's last trip must have its meeting logged before a new one
        // can start. Safe to check against "today" here because getTodayDate()
        // is Asia/Kolkata-based, so this trip can never belong to a previous day.
        if (lastTrip && lastTrip.endTime && !lastTrip.meetingDetails?.customerName) {
            return res.status(400).json({
                success: false,
                message: "Add meeting details for your last trip before starting a new one",
                meetingDetailsRequired: true
            });
        }

        travel.trips.push({
            purpose,
            userId,
            startTime: new Date(),
            startLocation: { lat, lng, address },
            endTime: null,
            endLocation: null,
            distanceKm: 0,
            durationMin: 0
        });

        await travel.save();

        res.status(200).json({
            success: true,
            message: "Trip started successfully",
            data: travel
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/* =========================
   END TRIP (TOKEN BASED)
========================= */
exports.endTrip = async (req, res) => {
    try {
        const userId = req.user._id; // 🔥 FROM TOKEN
        const { lat, lng, address } = req.body;

        const date = getTodayDate();

        const travel = await Travel.findOne({ userId, date });

        if (!travel || travel.trips.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No active trip found"
            });
        }

        const lastTrip = travel.trips[travel.trips.length - 1];

        if (lastTrip.endTime) {
            return res.status(400).json({
                success: false,
                message: "No active trip to end"
            });
        }

        const endTime = new Date();

        const distance = calculateDistance(
            lastTrip.startLocation.lat,
            lastTrip.startLocation.lng,
            lat,
            lng
        );

        lastTrip.endTime = endTime;
        lastTrip.endLocation = { lat, lng, address };
        lastTrip.distanceKm = Number(distance.toFixed(2));
        lastTrip.durationMin = Math.round(
            (endTime - lastTrip.startTime) / 60000
        );

        travel.totalTrips = travel.trips.length;
        travel.totalDistanceKm = travel.trips.reduce(
            (sum, t) => sum + (t.distanceKm || 0),
            0
        );

        await travel.save();

        res.status(200).json({
            success: true,
            message: "Trip ended successfully",
            data: travel
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/* =========================
   LOG MEETING DETAILS FOR A FINISHED TRIP
   (separate step from ending the trip; enforced
   client-side immediately after the trip ends, so
   it is always tied to a specific tripId rather than
   a "last trip" lookup that could span calendar days)
========================= */
exports.logMeeting = async (req, res) => {
    try {
        const userId = req.user._id;
        const { tripId, customerName, meetingStartTime, meetingEndTime, notes } = req.body;

        if (!tripId || !customerName || !meetingStartTime || !meetingEndTime || !notes) {
            return res.status(400).json({
                success: false,
                message: "Meeting details (customer name, start time, end time, notes) are required"
            });
        }

        const travel = await Travel.findOne({ userId, "trips._id": tripId });

        if (!travel) {
            return res.status(404).json({
                success: false,
                message: "Trip not found"
            });
        }

        const trip = travel.trips.id(tripId);

        if (!trip.endTime) {
            return res.status(400).json({
                success: false,
                message: "Trip must be ended before logging its meeting details"
            });
        }

        trip.meetingDetails = { customerName, meetingStartTime, meetingEndTime, notes };

        await travel.save();

        res.status(200).json({
            success: true,
            message: "Meeting details saved successfully",
            data: travel
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/* =========================
   GET TODAY TRAVEL
========================= */
exports.getTodayTravel = async (req, res) => {
    try {
        const userId = req.user._id;
        const date = getTodayDate();

        const travel = await Travel.findOne({ userId, date });

        if (!travel) {
            return res.json({
                success: true,
                data: {
                    totalTrips: 0,
                    totalDistanceKm: 0,
                    trips: []
                }
            });
        }

        res.json({
            success: true,
            data: travel
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/* =========================
   GET HISTORY
========================= */
exports.getTravelHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const data = await Travel.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/* =========================
   GET ALL TRAVEL (ADMIN)
========================= */
exports.getAllTravel = async (req, res) => {
    try {
        const records = await Travel.find({ companyId: req.user.companyId ?? null })
            .populate("userId", "fullName email department designation")
            .sort({ date: -1 });

        let totalDistanceKm = 0;
        let activeTripsCount = 0;
        let completedTripsCount = 0;

        const trips = [];

        records.forEach((record) => {
            (record.trips || []).forEach((trip) => {
                totalDistanceKm += trip.distanceKm || 0;

                if (trip.endTime) {
                    completedTripsCount += 1;
                } else {
                    activeTripsCount += 1;
                }

                trips.push({
                    _id: trip._id,
                    employee: record.userId,
                    purpose: trip.purpose,
                    date: record.date,
                    startTime: trip.startTime,
                    endTime: trip.endTime,
                    startLocation: trip.startLocation,
                    endLocation: trip.endLocation,
                    distanceKm: trip.distanceKm,
                    meetingDetails: trip.meetingDetails,
                    status: trip.endTime ? "completed" : "in-progress"
                });
            });
        });

        trips.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        res.json({
            success: true,
            data: {
                totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
                activeTripsCount,
                completedTripsCount,
                trips
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};