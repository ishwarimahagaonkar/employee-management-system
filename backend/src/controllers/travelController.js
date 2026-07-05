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
   GET TODAY DATE
========================= */
function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

/* =========================
   START TRIP (TOKEN BASED)
========================= */
exports.startTrip = async (req, res) => {
    try {
        const userId = req.user.id; // 🔥 FROM TOKEN
        const {purpose, lat, lng, address } = req.body;

        const date = getTodayDate();

        let travel = await Travel.findOne({ userId, date });

        if (!travel) {
            travel = new Travel({
                userId,
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

        travel.trips.push({
            purpose,
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
        console.error("Start Trip Error:", error);
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
        const userId = req.user.id; // 🔥 FROM TOKEN
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
        console.error("End Trip Error:", error);
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
        const userId = req.user.id;
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
        console.error(error);
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
        const userId = req.user.id;

        const data = await Travel.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};