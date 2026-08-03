const Travel = require("../models/Travel");
const User = require("../models/User");
const { getPagination } = require("../utils/pagination");
const { isValidCoord } = require("../utils/locationCheck");
const { STAFF_ROLES } = require("../config/roles");

// Validates a list of co-traveler ids: keeps only active, same-company staff
// (admins no longer travel), excluding the trip creator. Returns ObjectIds.
async function resolveCoTravelers(rawIds, primaryUserId, companyId) {
    if (!Array.isArray(rawIds) || rawIds.length === 0) return [];

    const ids = [...new Set(rawIds.map(String))].filter((id) => id !== String(primaryUserId));
    if (ids.length === 0) return [];

    const users = await User.find({
        _id: { $in: ids },
        companyId: companyId ?? null,
        role: { $in: STAFF_ROLES },
        isActive: { $ne: false },
    }).select("_id");

    return users.map((u) => u._id);
}

/* =========================
   Haversine Distance (KM)
   Straight-line fallback only — real trips use road distance below.
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
   Road Distance (KM) via OSRM
   The Haversine straight line consistently undercounts real travel (roads
   are never straight), so trip distance is taken from the OSRM public
   routing service. Falls back to null on any failure/timeout so the caller
   can use the Haversine value instead of blocking the punch-out.
========================= */
async function getRoadDistanceKm(lat1, lon1, lat2, lon2) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${lon1},${lat1};${lon2},${lat2}?overview=false`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) return null;

        const json = await resp.json();
        const meters = json?.routes?.[0]?.distance;

        if (json.code === "Ok" && typeof meters === "number") {
            return meters / 1000;
        }
        return null;
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/* =========================
   Path Distance (KM) from a recorded GPS route
   Sums the actual path driven. The client already filters out readings with
   poor accuracy; this adds a teleport guard so a single GPS glitch cannot
   inflate the total. Returns null when the route is unusable.
========================= */
function computePathKm(route, startAnchor, endAnchor) {
    if (!Array.isArray(route)) return null;

    // Points must fall inside the trip's own time window.
    //
    // Without this, a route left over from an EARLIER trip was summed against
    // this trip's start/end anchors. The teleport guard below could not catch
    // it, because that guard is speed-based: a point ten hours stale makes even
    // a 50 km jump look like 5 km/h, so the bogus distance was added and --
    // being larger than the straight line -- always won the source comparison.
    // The result was a trip reported at many times its real distance.
    //
    // A minute of slack each side covers clock skew between device and server.
    const SLACK_MS = 60000;
    const windowStart = startAnchor?.t ? startAnchor.t - SLACK_MS : null;
    const windowEnd = endAnchor?.t ? endAnchor.t + SLACK_MS : null;

    const points = route
        .filter((p) => p && isValidCoord(p.lat) && isValidCoord(p.lng))
        .map((p) => ({ lat: p.lat, lng: p.lng, t: Number(p.t) || null }))
        .filter((p) => {
            if (windowStart === null || windowEnd === null) return true;
            // An untimestamped point can't be shown to belong to this trip.
            if (!p.t) return false;
            return p.t >= windowStart && p.t <= windowEnd;
        })
        .slice(0, 3000);

    // Fewer than two usable points means the recording is unusable; the caller
    // falls back to the routed start->end distance, which is never inflated.
    if (points.length < 2) return null;

    // Anchor with the trip's start/end fixes so a late GPS lock at the
    // beginning (or a missed final update) doesn't drop part of the path.
    if (startAnchor) points.unshift(startAnchor);
    if (endAnchor) points.push(endAnchor);

    let km = 0;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];

        const seg = calculateDistance(prev.lat, prev.lng, cur.lat, cur.lng);

        // Teleport guard: skip segments implying > 150 km/h, or > 5 km
        // jumps when timestamps are missing.
        if (prev.t && cur.t && cur.t > prev.t) {
            const hours = (cur.t - prev.t) / 3600000;
            if (seg / hours > 150) continue;
        } else if (seg > 5) {
            continue;
        }

        km += seg;
    }

    return km;
}

/* =========================
   Thin a route for storage (keeps shape, caps document size)
========================= */
function thinRoute(route, max = 600) {
    const points = (Array.isArray(route) ? route : [])
        .filter((p) => p && isValidCoord(p.lat) && isValidCoord(p.lng))
        .map((p) => ({ lat: p.lat, lng: p.lng, t: Number(p.t) || null }))
        .slice(0, 3000);

    if (points.length <= max) return points;

    const step = points.length / max;
    const out = [];
    for (let i = 0; i < max; i++) {
        out.push(points[Math.floor(i * step)]);
    }
    return out;
}

/* =========================
   GET TODAY DATE (Asia/Kolkata)
========================= */
function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Finds the user's currently-open trip, wherever it lives.
 *
 * A trip is stored under the date it STARTED. Looking it up by today's date --
 * as this used to -- meant a trip begun at 23:30 and ended at 00:15 searched
 * the wrong document, answered "No active trip found", and stayed open
 * forever. That also stopped the client clearing its recorded GPS route, which
 * then leaked into the next trip's distance.
 *
 * Returns { travel, trip } or null.
 */
async function findOpenTrip(userId) {
    // `endTime: null` also matches documents where the field was never set.
    const travel = await Travel.findOne({ userId, "trips.endTime": null })
        .sort({ date: -1 });

    if (!travel) return null;

    const trip = travel.trips[travel.trips.length - 1];
    if (!trip || trip.endTime) return null;

    return { travel, trip };
}

/* =========================
   START TRIP (TOKEN BASED)
========================= */
exports.startTrip = async (req, res) => {
    try {
        const userId = req.user._id; // 🔥 FROM TOKEN
        const { purpose, lat, lng, address, coTravelers } = req.body;

        if (!purpose || !purpose.trim()) {
            return res.status(400).json({ success: false, message: "Trip purpose is required" });
        }

        if (!isValidCoord(lat) || !isValidCoord(lng)) {
            return res.status(400).json({ success: false, message: "Valid start location is required" });
        }

        const validCoTravelers = await resolveCoTravelers(coTravelers, userId, req.user.companyId);

        // Checked across dates, not just today: a trip started before midnight
        // is still in progress after it, and starting a second one would leave
        // two open trips that no lookup could tell apart.
        const alreadyOpen = await findOpenTrip(userId);
        if (alreadyOpen) {
            return res.status(400).json({
                success: false,
                message: "Trip already in progress"
            });
        }

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

        const lastTrip = travel.trips[travel.trips.length - 1];

        // The previous trip must have its meeting logged before a new one can
        // start. Checked against yesterday too, because a trip that ran past
        // midnight ended in yesterday's document -- scoping this to today let
        // such a trip escape the requirement entirely.
        const previousDoc = lastTrip
            ? travel
            : await Travel.findOne({ userId, date: { $lt: date } }).sort({ date: -1 });

        const previousTrip = previousDoc?.trips?.[previousDoc.trips.length - 1];

        // A trip closed by the repair script has no end location and no real
        // duration, so demanding meeting notes for it would block the user on
        // a journey nobody can now describe.
        if (
            previousTrip &&
            previousTrip.endTime &&
            previousTrip.distanceSource !== "unrecorded" &&
            !previousTrip.meetingDetails?.customerName
        ) {
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
            durationMin: 0,
            coTravelers: validCoTravelers
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
        const { lat, lng, address, route } = req.body;

        if (!isValidCoord(lat) || !isValidCoord(lng)) {
            return res.status(400).json({ success: false, message: "Valid end location is required" });
        }

        // Looked up by open-trip rather than by today's date, so a trip that
        // ran past midnight can still be ended (see findOpenTrip).
        const open = await findOpenTrip(userId);

        if (!open) {
            return res.status(400).json({
                success: false,
                message: "No active trip to end"
            });
        }

        const { travel, trip: lastTrip } = open;
        const endTime = new Date();

        const straightKm = calculateDistance(
            lastTrip.startLocation.lat,
            lastTrip.startLocation.lng,
            lat,
            lng
        );

        // Distance preference:
        //   1. gps  — sum of the recorded route (actual path driven)
        //   2. road — routed road distance start→end (OSRM)
        //   3. straight — straight line, last resort
        // A complete GPS path can never be shorter than the straight line
        // (triangle inequality) — if it is, the recording has gaps and the
        // routed estimate is more trustworthy.
        let distance = null;
        let distanceSource = "straight";

        const pathKm = computePathKm(
            route,
            {
                lat: lastTrip.startLocation.lat,
                lng: lastTrip.startLocation.lng,
                t: new Date(lastTrip.startTime).getTime(),
            },
            { lat, lng, t: endTime.getTime() }
        );

        if (pathKm !== null && pathKm >= straightKm * 0.9) {
            distance = pathKm;
            distanceSource = "gps";
        } else {
            const roadKm = await getRoadDistanceKm(
                lastTrip.startLocation.lat,
                lastTrip.startLocation.lng,
                lat,
                lng
            );

            if (roadKm !== null) {
                distance = roadKm;
                distanceSource = "road";
            } else {
                distance = straightKm;
            }
        }

        lastTrip.endTime = endTime;
        lastTrip.endLocation = { lat, lng, address };
        lastTrip.distanceKm = Number(distance.toFixed(2));
        lastTrip.distanceSource = distanceSource;
        lastTrip.route = thinRoute(route);
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

        // Two days, newest first: a trip that ran past midnight ended in
        // YESTERDAY's document, and its meeting still has to be collected.
        // Deriving that from today's trips alone (as the app used to) left
        // such a trip permanently un-loggable -- and startTrip blocks on it.
        const recent = await Travel.find({ userId })
            .sort({ date: -1 })
            .limit(2)
            .select("-trips.route")
            .populate("trips.coTravelers", "fullName");

        const travel = recent.find((d) => d.date === date) || null;

        // Newest ended trip anywhere in that window still missing its meeting.
        let pendingMeeting = null;
        for (const doc of recent) {
            const trip = doc.trips?.[doc.trips.length - 1];
            if (
                trip &&
                trip.endTime &&
                // Repair-closed trips are skipped: there is nothing to report a
                // meeting against, and prompting for one would be a dead end.
                trip.distanceSource !== "unrecorded" &&
                !trip.meetingDetails?.customerName
            ) {
                pendingMeeting = { ...trip.toObject(), date: doc.date };
                break;
            }
        }

        // Surfaced so the app can offer "end trip" on a trip started
        // yesterday rather than showing an idle screen.
        const open = await findOpenTrip(userId);
        const activeTrip = open
            ? { _id: open.trip._id, startTime: open.trip.startTime, purpose: open.trip.purpose, date: open.travel.date }
            : null;

        if (!travel) {
            return res.json({
                success: true,
                data: {
                    totalTrips: 0,
                    totalDistanceKm: 0,
                    trips: [],
                    pendingMeeting,
                    activeTrip,
                },
            });
        }

        res.json({
            success: true,
            data: { ...travel.toObject(), pendingMeeting, activeTrip },
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
        const { paginate, page, limit, skip } = getPagination(req.query);

        // The user's own trips (as trip creator), with co-traveler names.
        let queryBuilder = Travel.find({ userId })
            .select("-trips.route")
            .populate("trips.coTravelers", "fullName")
            .sort({ createdAt: -1 });
        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [ownDocs, total] = await Promise.all([
            queryBuilder,
            paginate ? Travel.countDocuments({ userId }) : Promise.resolve(undefined),
        ]);

        // Trips (in OTHER users' docs) where this user was added as a co-traveler.
        // Surfaced read-only with full trip data (including the trip's km),
        // but the day's totalDistanceKm stays 0 so nothing is added to the
        // co-traveler's own km totals / reimbursement.
        //
        // Bounded even when the caller didn't ask for a page: this query has no
        // date filter, so left open it returns every trip the user was ever a
        // co-traveler on and grows for the life of the account.
        const coDocs = await Travel.find({ "trips.coTravelers": userId })
            .select("-trips.route")
            .populate("userId", "fullName")
            .sort({ createdAt: -1 })
            .limit(paginate ? limit : 50);

        const coEntries = [];
        coDocs.forEach((doc) => {
            const primaryName = doc.userId?.fullName || "a colleague";
            (doc.trips || []).forEach((trip) => {
                const isCo = (trip.coTravelers || []).some((id) => String(id) === String(userId));
                if (!isCo) return;

                coEntries.push({
                    _id: `${doc._id}:${trip._id}`,
                    date: doc.date,
                    totalDistanceKm: 0,
                    isCoTraveler: true,
                    trips: [
                        {
                            _id: trip._id,
                            purpose: trip.purpose,
                            startTime: trip.startTime,
                            endTime: trip.endTime,
                            startLocation: trip.startLocation,
                            endLocation: trip.endLocation,
                            distanceKm: trip.distanceKm,   // shown, but never summed for co-travelers
                            distanceSource: trip.distanceSource,
                            durationMin: trip.durationMin,
                            meetingDetails: trip.meetingDetails,
                            traveledWith: primaryName,
                            isCoTraveler: true,
                        },
                    ],
                });
            });
        });

        // Merge own + co-traveler day entries, newest first (by stored date).
        const data = [...ownDocs.map((d) => d.toObject()), ...coEntries].sort((a, b) =>
            (b.date || "").localeCompare(a.date || "")
        );

        res.json({
            success: true,
            total,
            page: paginate ? page : 1,
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
        const filter = { companyId: req.user.companyId ?? null };
        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Travel.find(filter)
            .select("-trips.route")
            .populate("userId", "fullName email department designation")
            .populate("trips.coTravelers", "fullName")
            .sort({ date: -1 });
        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [records, total] = await Promise.all([
            queryBuilder,
            Travel.countDocuments(filter),
        ]);

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
                    distanceSource: trip.distanceSource,
                    durationMin: trip.durationMin,
                    meetingDetails: trip.meetingDetails,
                    coTravelers: trip.coTravelers,
                    status: trip.endTime ? "completed" : "in-progress"
                });
            });
        });

        trips.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        res.json({
            success: true,
            total,
            page: paginate ? page : 1,
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