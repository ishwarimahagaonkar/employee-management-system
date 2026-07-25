import { useEffect, useState } from "react";
import api from "../../../../api/api.js";
import { getApiErrorMessage } from "../../../../utils/apiError.js";

export default function useAdminTravel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [activeTripsCount, setActiveTripsCount] = useState(0);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [trips, setTrips] = useState([]);

  const fetchTravel = async () => {
    try {
      setError(null);
      const res = await api.get("/travel/admin/all");
      const data = res.data?.data;

      setTotalDistanceKm(data?.totalDistanceKm || 0);
      setActiveTripsCount(data?.activeTripsCount || 0);
      setCompletedTripsCount(data?.completedTripsCount || 0);
      setTrips(data?.trips || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravel();
  }, []);

  const retry = () => {
    setLoading(true);
    fetchTravel();
  };

  const activeTrips = trips.filter((t) => t.status === "in-progress");

  return {
    loading,
    error,
    retry,
    totalDistanceKm,
    activeTripsCount,
    completedTripsCount,
    trips,
    activeTrips,
    fetchTravel,
  };
}
