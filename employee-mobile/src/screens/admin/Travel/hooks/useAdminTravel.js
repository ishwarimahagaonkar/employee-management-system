import { useEffect, useState } from "react";
import api from "../../../../api/api.js";

export default function useAdminTravel() {
  const [loading, setLoading] = useState(true);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [activeTripsCount, setActiveTripsCount] = useState(0);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [trips, setTrips] = useState([]);

  const fetchTravel = async () => {
    try {
      const res = await api.get("/travel/admin/all");
      const data = res.data?.data;

      setTotalDistanceKm(data?.totalDistanceKm || 0);
      setActiveTripsCount(data?.activeTripsCount || 0);
      setCompletedTripsCount(data?.completedTripsCount || 0);
      setTrips(data?.trips || []);
    } catch (err) {
      console.log("Admin travel fetch error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravel();
  }, []);

  const activeTrips = trips.filter((t) => t.status === "in-progress");

  return {
    loading,
    totalDistanceKm,
    activeTripsCount,
    completedTripsCount,
    trips,
    activeTrips,
    fetchTravel,
  };
}
