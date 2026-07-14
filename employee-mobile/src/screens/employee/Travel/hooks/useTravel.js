import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import api from "../../../../api/api.js";
import { Alert } from "react-native";

export default function useTravel() {
  const [todayTravel, setTodayTravel] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  const fetchTravel = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/travel/today", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data;

      setTodayTravel(data);

      const trips = data?.trips || [];
      const lastTrip = trips[trips.length - 1];

      setActiveTrip(lastTrip && !lastTrip.endTime);
    } catch (err) {
      console.log(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/travel/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const days = res.data?.data || [];

      const allTrips = days
        .flatMap((day) => (day.trips || []).map((trip) => ({ ...trip, date: day.date })))
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      setHistory(allTrips);
    } catch (err) {
      console.log(err.response?.data || err.message);
    } finally {
      setHistoryLoading(false);
    }
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

    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Could not get your location. Please check your GPS/network signal and try again.")), 15000)
      ),
    ]);

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
      console.log("Reverse geocode failed:", err.message);
    }

    return { lat: latitude, lng: longitude, address };
  };

  const startTrip = async (purpose, onSuccess) => {
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
        { ...loc, purpose },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Trip Started");
      await fetchTravel();
      onSuccess?.();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || "Failed");
    } finally {
      setBtnLoading(false);
    }
  };

  const endTrip = async (onSuccess) => {
    try {
      setBtnLoading(true);

      const token = await AsyncStorage.getItem("token");
      const loc = await getLocation();

      await api.post(
        "/travel/end",
        { ...loc },
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

  // Today's most recently ended trip, if it still needs its meeting logged.
  // Scoped entirely to todayTravel (today's IST date, per the backend), so
  // this can never point at a trip from a previous day.
  const pendingMeetingTrip =
    currentTrip && currentTrip.endTime && !currentTrip.meetingDetails?.customerName
      ? currentTrip
      : null;

  return {
    todayTravel,
    history,
    loading,
    historyLoading,
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
