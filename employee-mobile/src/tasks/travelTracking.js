// Background GPS route tracking for business trips.
//
// While a trip is active, a background location task appends GPS points to
// AsyncStorage. When the trip ends, the recorded route is handed to the
// backend, which sums the actual path driven instead of estimating the
// distance between the start and end points.
//
// This module must be imported from index.js (global scope) so the task is
// defined even when the app is launched headless by the OS.

import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TRAVEL_TASK = "travel-location-tracking";

const STORAGE_KEY = "travelRoutePoints";

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
 * Start background route recording for a trip.
 * Returns true if tracking started, false if the background permission was
 * declined — the trip still works, distance just falls back to the routed
 * start→end estimate.
 */
export async function startTravelTracking() {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return false;

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return false;

    // Drop any leftovers from a previous trip.
    await AsyncStorage.removeItem(STORAGE_KEY);

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

    return true;
  } catch (err) {
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

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    points = raw ? JSON.parse(raw) : [];
  } catch (err) {}

  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRAVEL_TASK);
    if (running) {
      await Location.stopLocationUpdatesAsync(TRAVEL_TASK);
    }
  } catch (err) {}

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

  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRAVEL_TASK);
    if (running) {
      await Location.stopLocationUpdatesAsync(TRAVEL_TASK);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {}
}
