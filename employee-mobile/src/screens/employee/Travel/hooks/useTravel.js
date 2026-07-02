import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import api from "../../../../api/api.js";
import { Alert } from "react-native";

export default function useTravel() {
  const [todayTravel, setTodayTravel] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchTravel();
  }, []);

  const getLocation = async () => {
    const location = await Location.getCurrentPositionAsync({});
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      address: "Unknown",
    };
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
      Alert.alert("Error", err.response?.data?.message || "Failed");
    } finally {
      setBtnLoading(false);
    }
  };

  const endTrip = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const loc = await getLocation();

      await api.post("/travel/end", loc, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Trip Ended");
      fetchTravel();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed");
    }
  };

  const currentPurpose =
    todayTravel?.trips?.length > 0
      ? todayTravel.trips[todayTravel.trips.length - 1]?.purpose
      : "";

  return {
    todayTravel,
    loading,
    activeTrip,
    btnLoading,
    currentPurpose,
    fetchTravel,
    startTrip,
    endTrip,
  };
}