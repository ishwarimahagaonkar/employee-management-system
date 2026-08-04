import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import api from "../../../../api/api.js";
import { Alert } from "react-native";
import { getApiErrorMessage } from "../../../../utils/apiError.js";
import {
  startTravelTracking,
  stopTravelTracking,
  clearTravelRoute,
  stopTrackingIfStale,
} from "../../../../tasks/travelTracking.js";
import { breadcrumb, reportError } from "../../../../services/crashReporter";

// Most recent trips shown in the history list.
const HISTORY_LIMIT = 5;

// How many days of travel to pull for that list. Without this the endpoint
// returns EVERY day the user has ever travelled (getPagination treats missing
// params as "no pagination"), so the payload grew with every working day.
const HISTORY_PAGE_SIZE = 20;

// How long to wait for a usable GPS fix before giving up. A cold GPS start
// routinely needs 20-40s, so this is deliberately generous -- the alternative
// is telling someone standing at their destination that they cannot end their
// trip.
const FIX_TIMEOUT_MS = 30000;

// Stop waiting as soon as a fix is at least this precise (meters). Anything
// better than this is indistinguishable for a trip-distance calculation.
const GOOD_ACCURACY_M = 50;

/**
 * Waits for a usable GPS fix, with a timeout that actually cancels.
 *
 * Two things this has to get right:
 *
 * 1. CANCELLATION. This used to be Promise.race([getCurrentPositionAsync(),
 *    timeout]). Racing does not cancel the loser, and getCurrentPositionAsync
 *    takes no abort signal (checked against expo-location in SDK 56), so every
 *    timed-out attempt left a live high-accuracy GPS listener running for the
 *    lifetime of the process. watchPositionAsync returns a subscription we can
 *    remove(), so the native listener is released on every path.
 *
 * 2. NOT GRABBING THE FIRST FIX. watchPositionAsync fires as soon as ANY fix
 *    exists, which on a cold start is often a coarse network/wifi position
 *    hundreds of meters out. Returning that got it rejected a line later by
 *    the caller's accuracy check, telling someone standing at their
 *    destination that their signal was too weak -- when waiting two more
 *    seconds would have produced a good GPS fix.
 *
 *    So: settle early once a fix is genuinely good, otherwise keep the most
 *    precise one seen and hand that back when the clock runs out. Failing
 *    outright is reserved for having no fix at all.
 */
async function getPositionOnce() {
  let subscription = null;
  let timer = null;
  let best = null;

  const isBetter = (candidate, current) => {
    if (!current) return true;
    const a = candidate?.coords?.accuracy;
    const b = current?.coords?.accuracy;
    // A reading with no accuracy figure can't be shown to be an improvement.
    if (a == null) return false;
    if (b == null) return true;
    return a < b;
  };

  try {
    return await new Promise((resolve, reject) => {
      const finish = (fn, arg) => {
        if (timer) clearTimeout(timer);
        timer = null;
        subscription?.remove();
        subscription = null;
        fn(arg);
      };

      timer = setTimeout(() => {
        // Out of time: the best reading beats no reading. The caller still
        // applies its own accuracy limit, so a hopeless fix is refused there
        // with a message about signal rather than about timing.
        if (best) finish(resolve, best);
        else finish(reject, new Error(
          "Could not get your location. Please check your GPS/network signal and try again."
        ));
      }, FIX_TIMEOUT_MS);

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
        (position) => {
          if (isBetter(position, best)) best = position;

          const accuracy = position?.coords?.accuracy;
          if (accuracy == null || accuracy <= GOOD_ACCURACY_M) {
            finish(resolve, position);
          }
          // Otherwise keep listening -- accuracy improves as the fix settles.
        },
        (error) => {
          // A stream error after we already have something usable shouldn't
          // throw that away.
          if (best) finish(resolve, best);
          else finish(reject, error instanceof Error ? error : new Error(String(error)));
        }
      )
        .then((sub) => {
          // The fix can arrive before this resolves; if finish() already ran,
          // tear the subscription down immediately rather than leaking it.
          if (timer === null) sub.remove();
          else subscription = sub;
        })
        .catch((err) => finish(reject, err));
    });
  } finally {
    // Belt and braces: nothing below this line may leave a listener behind.
    if (timer) clearTimeout(timer);
    subscription?.remove();
  }
}

export default function useTravel() {
  const [todayTravel, setTodayTravel] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const fetchTravel = async () => {
    try {
      setError(null);

      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/travel/today", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data;

      setTodayTravel(data);

      // The server reports the open trip across dates, because a trip started
      // before midnight is still running after it and lives in the previous
      // day's document. Falling back to today's last trip keeps this working
      // against an older backend.
      const trips = data?.trips || [];
      const lastTrip = trips[trips.length - 1];

      const isActive = data?.activeTrip
        ? true
        : Boolean(lastTrip && !lastTrip.endTime);

      setActiveTrip(isActive);

      // If GPS recording is still running but no trip is active (trip ended
      // on another device, app crash, …), stop it.
      stopTrackingIfStale(isActive);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/travel/history", {
        headers: { Authorization: `Bearer ${token}` },
        // Bounded on purpose: the endpoint returns the user's ENTIRE travel
        // history when no page/limit is supplied, and only five rows are ever
        // rendered from it.
        params: { page: 1, limit: HISTORY_PAGE_SIZE },
      });

      const days = res.data?.data || [];

      const allTrips = days
        .flatMap((day) => (day.trips || []).map((trip) => ({ ...trip, date: day.date })))
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      // Only the latest few on the screen -- the full list gets unwieldy fast.
      setHistory(allTrips.slice(0, HISTORY_LIMIT));
      setHistoryTotal(allTrips.length);
    } catch (err) {
      setHistoryError(getApiErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    setHistoryLoading(true);
    setHistoryError(null);
    fetchTravel();
    fetchHistory();
  };

  useEffect(() => {
    fetchTravel();
    fetchHistory();
  }, []);

  const getLocation = async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    let granted = permission.granted;

    if (!granted && permission.canAskAgain) {
      const result = await Location.requestForegroundPermissionsAsync();
      granted = result.granted;
    }

    if (!granted) {
      throw new Error(
        "Location permission is required to track travel. Please enable it for this app in your device Settings."
      );
    }

    const location = await getPositionOnce();

    // Reject readings too imprecise to trust for a distance calculation --
    // a coarse network/WiFi-based fix can be off by several kilometers.
    if (location.coords.accuracy != null && location.coords.accuracy > 100) {
      throw new Error(
        "Your location signal is too weak for accurate tracking. Move to an open area and try again."
      );
    }
    const { latitude, longitude } = location.coords;

    let address = "Address unavailable";

    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const a = addresses[0];
        address = [a.name, a.street, a.district, a.city, a.region, a.postalCode, a.country]
          .filter(Boolean)
          .join(", ");
      }
    } catch (err) {
    }

    return { lat: latitude, lng: longitude, address };
  };

  const startTrip = async (purpose, coTravelers = [], onSuccess) => {
    try {
      if (!purpose.trim()) {
        Alert.alert("Enter purpose");
        return;
      }

      setBtnLoading(true);

      const token = await AsyncStorage.getItem("token");
      const loc = await getLocation();

      await api.post(
        "/travel/start",
        { ...loc, purpose, coTravelers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Record the actual route in the background for accurate km. If the
      // user declines "Allow all the time" location, the trip still works —
      // distance falls back to the routed start→end estimate.
      const tracking = await startTravelTracking();
      if (!tracking) {
        Alert.alert(
          "Heads up",
          'Background location is off, so distance will be estimated from start and end points only. For exact km, allow location "All the time" in Settings.'
        );
      }

      Alert.alert("Success", "Trip Started");
      await fetchTravel();
      onSuccess?.();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || "Failed");
    } finally {
      setBtnLoading(false);
    }
  };

  // Breadcrumbed step by step because this is the flow that has been killing
  // the app in the field. A native crash here arrives with a stack that names
  // no JS at all, so the last breadcrumb before it is what identifies the
  // stage that failed -- acquiring the GPS fix, stopping the background task,
  // or the upload itself.
  const endTrip = async (onSuccess) => {
    try {
      setBtnLoading(true);
      breadcrumb("endTrip: start");

      const token = await AsyncStorage.getItem("token");

      breadcrumb("endTrip: acquiring fix");
      const loc = await getLocation();
      breadcrumb(`endTrip: fix acquired (accuracy=${Math.round(loc?.accuracy ?? -1)}m)`);

      // Hand the recorded GPS route to the backend so it can sum the actual
      // path driven. Empty when background tracking was off — the backend
      // then falls back to the routed start→end distance. The stored route
      // is only cleared after the server confirms, so a failed request can
      // be retried without losing the recorded path.
      breadcrumb("endTrip: stopping tracking");
      const route = await stopTravelTracking();
      breadcrumb(`endTrip: tracking stopped (${route?.length ?? 0} points)`);

      await api.post(
        "/travel/end",
        { ...loc, route },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      breadcrumb("endTrip: server accepted");

      await clearTravelRoute();

      await fetchTravel();
      await fetchHistory();
      breadcrumb("endTrip: done");
      onSuccess?.();
    } catch (err) {
      // A failure the user was shown is still worth a report: the alert only
      // reaches the person holding the phone, and "End Trip keeps failing"
      // has so far arrived without any detail attached.
      reportError(err, "endTrip failed");
      Alert.alert("Error", err.response?.data?.message || err.message || "Failed");
    } finally {
      setBtnLoading(false);
    }
  };

  // Records the meeting for a trip that has already ended. This is a
  // separate step from ending the trip itself, and is always targeted at
  // a specific tripId -- never derived from "last trip" lookups that could
  // accidentally span into a previous calendar day.
  const logMeeting = async (tripId, details, onSuccess) => {
    try {
      setBtnLoading(true);

      const token = await AsyncStorage.getItem("token");

      await api.post(
        "/travel/meeting",
        { tripId, ...details },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchTravel();
      await fetchHistory();
      onSuccess?.();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || "Failed");
    } finally {
      setBtnLoading(false);
    }
  };

  const currentTrip =
    todayTravel?.trips?.length > 0
      ? todayTravel.trips[todayTravel.trips.length - 1]
      : null;

  // The most recently ended trip still needing its meeting logged.
  //
  // Taken from the server, which looks across dates: a trip that ran past
  // midnight ENDS in the previous day's document, and deriving this from
  // today's trips alone left it permanently un-loggable -- while startTrip
  // refused to begin a new trip until it was filled in.
  const pendingMeetingTrip =
    todayTravel?.pendingMeeting ||
    (currentTrip && currentTrip.endTime && !currentTrip.meetingDetails?.customerName
      ? currentTrip
      : null);

  return {
    todayTravel,
    history,
    historyTotal,
    loading,
    historyLoading,
    error,
    historyError,
    retry,
    activeTrip,
    pendingMeetingTrip,
    btnLoading,
    currentTrip,
    fetchTravel,
    fetchHistory,
    startTrip,
    endTrip,
    logMeeting,
  };
}
