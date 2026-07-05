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
      throw new Error("Location permission is required to track travel");
    }

    const location = await Location.getCurrentPositionAsync({});
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

  const endTrip = async () => {
    try {
      setBtnLoading(true);

      const token = await AsyncStorage.getItem("token");
      const loc = await getLocation();

      await api.post("/travel/end", loc, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Trip Ended");
      await fetchTravel();
      await fetchHistory();
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

  return {
    todayTravel,
    history,
    loading,
    historyLoading,
    activeTrip,
    btnLoading,
    currentTrip,
    fetchTravel,
    fetchHistory,
    startTrip,
    endTrip,
  };
}
