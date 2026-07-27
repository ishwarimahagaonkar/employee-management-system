import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api.js";
import { getApiErrorMessage } from "../../../../utils/apiError.js";

const DEFAULT_PAID_ALLOTMENT = 12;

export default function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [presentDays, setPresentDays] = useState(0);
  const [lateMarks, setLateMarks] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState(DEFAULT_PAID_ALLOTMENT);
  const [travelKm, setTravelKm] = useState(0);

  const fetchDashboard = async () => {
    try {
      setError(null);

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [profileRes, todayRes, monthlyRes, leaveRes, travelRes, settingsRes] = await Promise.all([
        api.get("/employees/me"),
        api.get("/attendance/today"),
        api.get(`/attendance/monthly?month=${month}&year=${year}`),
        api.get("/leave/my-leaves"),
        api.get("/travel/history"),
        api.get("/settings"),
      ]);

      setFullName(profileRes.data?.fullName || "");

      const today = todayRes.data;
      setCheckedIn(!!today?.punchInTime && !today?.punchOutTime);

      const monthRecords = monthlyRes.data?.attendance || [];
      setPresentDays(monthRecords.filter((r) => ["present", "approved"].includes(r.status)).length);
      setLateMarks(monthRecords.filter((r) => r.status === "late").length);

      // Paid leave is an annual allotment, so the balance counts days taken
      // this YEAR -- not every year the employee has ever worked.
      const leaves = leaveRes.data?.data || [];
      const paidDaysTaken = leaves
        .filter(
          (l) =>
            l.leaveType === "Paid" &&
            l.status === "Approved" &&
            new Date(l.startDate).getFullYear() === year
        )
        .reduce((sum, l) => sum + l.totalDays, 0);

      const allotment = settingsRes.data?.data?.paidLeaveAllotment;
      const paidAllotment =
        typeof allotment === "number" && allotment >= 0 ? allotment : DEFAULT_PAID_ALLOTMENT;
      setLeaveBalance(Math.max(paidAllotment - paidDaysTaken, 0));

      // Travel km for the CURRENT MONTH only, to match the present/late cards
      // beside it. Day records are keyed "YYYY-MM-DD".
      const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
      const travelDays = travelRes.data?.data || [];
      const totalKm = travelDays
        .filter((day) => (day.date || "").startsWith(monthPrefix))
        .reduce((sum, day) => sum + (day.totalDistanceKm || 0), 0);
      setTravelKm(totalKm);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchDashboard();
  };

  // Refetch whenever the dashboard regains focus. Without this the punch
  // status was whatever it had been at app start, so punching in on the
  // Attendance tab left this screen still saying "Checked Out".
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  return {
    loading,
    error,
    retry,
    fullName,
    checkedIn,
    presentDays,
    lateMarks,
    leaveBalance,
    travelKm,
    refresh: fetchDashboard,
  };
}
