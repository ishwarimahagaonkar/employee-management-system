import { useEffect, useState } from "react";
import api from "../../../../api/api.js";

const PAID_ALLOTMENT = 12;

export default function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [presentDays, setPresentDays] = useState(0);
  const [lateMarks, setLateMarks] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState(PAID_ALLOTMENT);
  const [travelKm, setTravelKm] = useState(0);

  const fetchDashboard = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [profileRes, todayRes, monthlyRes, leaveRes, travelRes] = await Promise.all([
        api.get("/employees/me"),
        api.get("/attendance/today"),
        api.get(`/attendance/monthly?month=${month}&year=${year}`),
        api.get("/leave/my-leaves"),
        api.get("/travel/history"),
      ]);

      setFullName(profileRes.data?.fullName || "");

      const today = todayRes.data;
      setCheckedIn(!!today?.punchInTime && !today?.punchOutTime);

      const monthRecords = monthlyRes.data?.attendance || [];
      setPresentDays(monthRecords.filter((r) => r.status === "present").length);
      setLateMarks(monthRecords.filter((r) => r.status === "late").length);

      const leaves = leaveRes.data?.data || [];
      const paidDaysTaken = leaves
        .filter((l) => l.leaveType === "Paid" && l.status === "Approved")
        .reduce((sum, l) => sum + l.totalDays, 0);
      setLeaveBalance(Math.max(PAID_ALLOTMENT - paidDaysTaken, 0));

      const travelDays = travelRes.data?.data || [];
      const totalKm = travelDays.reduce((sum, day) => sum + (day.totalDistanceKm || 0), 0);
      setTravelKm(totalKm);
    } catch (err) {
      console.log("Dashboard fetch error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    loading,
    fullName,
    checkedIn,
    presentDays,
    lateMarks,
    leaveBalance,
    travelKm,
    refresh: fetchDashboard,
  };
}
