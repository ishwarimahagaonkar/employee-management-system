// Background GPS route tracking for business trips.
//
// While a trip is active, a background location task appends GPS points to
// AsyncStorage. When the trip ends, the recorded route is handed to the
// backend, which sums the actual path driven instead of estimating the
// distance between the start and end points.
//
// This module must be imported from index.js (global scope) so the task is
// defined even when the app is launched headless by the OS.
//
// ---------------------------------------------------------------------------
// WHY THE "did we actually start?" FLAG EXISTS
//
// Ending a trip used to call stopLocationUpdatesAsync / hasStartedLocation-
// UpdatesAsync unconditionally, even when tracking had never started -- which
// is the normal case whenever background location was refused.
//
// Those are native calls into a location foreground service. On a build whose
// manifest lacks FOREGROUND_SERVICE / FOREGROUND_SERVICE_LOCATION (Android 9+
// and 14+ respectively), touching that service raises a SecurityException on
// the Android main thread. A native exception cannot be caught by the
// JavaScript try/catch around it, so the process is killed outright -- the app
// simply closes when the user taps End Trip.
//
// The flag below records whether startLocationUpdatesAsync actually succeeded.
// If it never did, ending a trip skips the native calls entirely: there is no
// service to stop, so there is nothing that can crash. It is stored rather than
// held in memory because a trip routinely outlives the JS context.
//
// This makes End Trip survivable over the air. It is NOT the whole fix -- a
// build carrying the correct manifest permissions is what actually restores
// background route recording.
// ---------------------------------------------------------------------------

import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TRAVEL_TASK = "travel-location-tracking";

const STORAGE_KEY = "travelRoutePoints";
const ACTIVE_KEY = "travelTrackingActive";

// Readings with worse accuracy than this (meters) are ignored — a coarse
// cell-tower fix can be off by kilometers and would corrupt the distance.
const MAX_ACCURACY_M = 50;

// Keep at most this many points in storage (~8h trip at one point / 30s).
const MAX_STORED_POINTS = 2000;

TaskManager.defineTask(TRAVEL_TASK, async ({ data, error }) => {
  if (error || !data) return;

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const points = raw ? JSON.parse(raw) : [];

    for (const loc of locations) {
      const { latitude, longitude, accuracy } = loc.coords;

      if (accuracy != null && accuracy > MAX_ACCURACY_M) continue;

      points.push({
        lat: latitude,
        lng: longitude,
        t: loc.timestamp,
      });
    }

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(points.slice(-MAX_STORED_POINTS))
    );
  } catch (err) {
    // Never throw from a background task.
  }
});

/**
 * Whether THIS app actually started the location service for the current trip.
 * Persisted, because a trip outlives the JS context.
 */
async function setTrackingActive(on) {
  try {
    if (on) await AsyncStorage.setItem(ACTIVE_KEY, "1");
    else await AsyncStorage.removeItem(ACTIVE_KEY);
  } catch (err) {
    // A storage failure must not break starting or ending a trip.
  }
}

async function isTrackingActive() {
  try {
    return (await AsyncStorage.getItem(ACTIVE_KEY)) === "1";
  } catch (err) {
    // Unknown means "assume not running": skipping a stop is recoverable,
    // crashing the app is not.
    return false;
  }
}

/**
 * Start background route recording for a trip.
 * Returns true if tracking started, false if the background permission was
 * declined — the trip still works, distance just falls back to the routed
 * start→end estimate.
 */
export async function startTravelTracking() {
  // Drop any leftovers FIRST, before the permission checks can return early.
  //
  // This used to happen after both checks passed, so a trip started with
  // background location denied kept the previous trip's points in storage --
  // and endTrip then sent them to the server, which summed a path across two
  // different journeys and reported a wildly inflated distance.
  await clearTravelRoute();

  // Nothing is running until proven otherwise, so a failed start can never
  // leave a stale "yes we're tracking" behind from an earlier trip.
  await setTrackingActive(false);

  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return false;

    // On a build whose manifest omits ACCESS_BACKGROUND_LOCATION this is
    // always refused -- which is exactly the case that used to set up the
    // crash at the end of the trip.
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return false;

    await Location.startLocationUpdatesAsync(TRAVEL_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000,
      distanceInterval: 50,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Trip in progress",
        notificationBody: "StaffTrack is recording your travel distance.",
        notificationColor: "#112250",
      },
    });

    // Only now is there a service that will later need stopping.
    await setTrackingActive(true);

    return true;
  } catch (err) {
    await setTrackingActive(false);
    return false;
  }
}

/**
 * Stop route recording and return the recorded points (may be empty).
 * Does NOT clear the stored route — call clearTravelRoute() after the
 * backend confirms the trip ended, so a failed request can be retried
 * without losing the recorded path.
 */
export async function stopTravelTracking() {
  let points = [];

  // Read the route FIRST. Whatever happens with the location service, the
  // recorded path must still reach the caller.
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    points = raw ? JSON.parse(raw) : [];
  } catch (err) {}

  // The guard that keeps End Trip alive: if we never started the service,
  // never touch it. See the note at the top of this file.
  if (await isTrackingActive()) {
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(TRAVEL_TASK);
      if (running) {
        await Location.stopLocationUpdatesAsync(TRAVEL_TASK);
      }
    } catch (err) {}

    await setTrackingActive(false);
  }

  return points;
}

/**
 * Forget the recorded route (after a successful trip end).
 */
export async function clearTravelRoute() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {}
}

/**
 * Stop tracking if it is running but no trip is active (app reinstalled
 * mid-trip, trip ended elsewhere, crash, …) so we never track outside a trip.
 */
export async function stopTrackingIfStale(hasActiveTrip) {
  if (hasActiveTrip) return;

  // Same guard as stopTravelTracking: this runs on every Travel screen load,
  // so an unguarded native call here would crash the app merely for opening
  // the screen.
  if (await isTrackingActive()) {
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(TRAVEL_TASK);
      if (running) {
        await Location.stopLocationUpdatesAsync(TRAVEL_TASK);
      }
    } catch (err) {}

    await setTrackingActive(false);
  }

  // Cleared whether or not tracking was still running. Previously this sat
  // inside the `running` branch, so a route left behind by a failed trip-end
  // (tracking already stopped, storage not cleared) survived to contaminate
  // the next trip. With no trip active, stored points are meaningless.
  await clearTravelRoute();
}
