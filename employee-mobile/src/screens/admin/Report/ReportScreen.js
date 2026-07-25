import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import DaySelector from "./components/DaySelector";
import EmployeeReportCard from "./components/EmployeeReportCard";
import DetailedReportPanel from "./components/DetailedReportPanel";
import EmployeeDayDetailModal from "./components/EmployeeDayDetailModal";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

const EXTRA_HOURS_THRESHOLD_MIN = 17 * 60 + 30; // 5:30 PM
const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Hours worked past 5:30 PM (Asia/Kolkata), computed via a fixed UTC+5:30
// offset rather than Intl timeZone APIs, which aren't reliably available
// across Hermes/web environments.
const extraHoursFor = (punchOutTime) => {
  if (!punchOutTime) return 0;

  const kolkataMs = new Date(punchOutTime).getTime() + KOLKATA_OFFSET_MS;
  const kolkataDate = new Date(kolkataMs);
  const minutesSinceMidnight = kolkataDate.getUTCHours() * 60 + kolkataDate.getUTCMinutes();
  const extraMinutes = minutesSinceMidnight - EXTRA_HOURS_THRESHOLD_MIN;

  return extraMinutes > 0 ? extraMinutes / 60 : 0;
};

// Asia/Kolkata calendar date ("YYYY-MM-DD") for a given ISO timestamp,
// matching the format the backend stores date/startDate/endDate in.
const toISTDateStr = (isoString) => {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const todayIST = () => toISTDateStr(new Date());

export default function ReportScreen({ navigation }) {
  const [mode, setMode] = useState("daily"); // "daily" | "detailed"
  const [selectedDate, setSelectedDate] = useState(todayIST());

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [trips, setTrips] = useState([]);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);

      const [employeesRes, attendanceRes, leaveRes, travelRes] = await Promise.all([
        api.get("/employees"),
        api.get("/attendance"),
        api.get("/leave"),
        api.get("/travel/admin/all"),
      ]);

      setEmployees(employeesRes.data?.employees || []);
      setAttendance(attendanceRes.data?.attendance || []);
      setLeaves(leaveRes.data?.data || []);
      setTrips(travelRes.data?.data?.trips || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isToday = selectedDate === todayIST();

  const shiftDate = (days) => {
    const next = new Date(`${selectedDate}T00:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(toISTDateStr(next));
  };

  const handlePrev = () => shiftDate(-1);
  const handleNext = () => {
    if (isToday) return;
    shiftDate(1);
  };

  // Employees who joined (account created) after the selected day weren't
  // employed yet, so they shouldn't show up in that day's report.
  const reportRows = employees
    .filter((employee) => !employee.createdAt || toISTDateStr(employee.createdAt) <= selectedDate)
    .map((employee) => {
      const extraHours = attendance
        .filter((a) => a.userId?._id === employee._id && a.date === selectedDate && a.punchOutTime)
        .reduce((sum, a) => sum + extraHoursFor(a.punchOutTime), 0);

      // A day counts as unpaid leave if it falls within an approved unpaid
      // leave's date range (startDate/endDate are inclusive "YYYY-MM-DD" strings).
      const unpaidLeaveDays = leaves.some(
        (l) =>
          l.userId?._id === employee._id &&
          l.leaveType === "Unpaid" &&
          l.status === "Approved" &&
          l.startDate <= selectedDate &&
          l.endDate >= selectedDate
      )
        ? 1
        : 0;

      const distanceKm = trips
        .filter(
          (t) =>
            t.employee?._id === employee._id &&
            toISTDateStr(t.startTime) === selectedDate
        )
        .reduce((sum, t) => sum + (t.distanceKm || 0), 0);

      return { employee, extraHours, unpaidLeaveDays, distanceKm };
    });

  const filteredRows = reportRows.filter((row) =>
    row.employee.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  // Selected employee's attendance + trips for the chosen day (for the detail page).
  const detailAttendance = detailEmployee
    ? attendance.find((a) => a.userId?._id === detailEmployee._id && a.date === selectedDate) || null
    : null;

  const detailTrips = detailEmployee
    ? trips
        .filter(
          (t) => t.employee?._id === detailEmployee._id && toISTDateStr(t.startTime) === selectedDate
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === "daily" && styles.modeTabActive]}
          onPress={() => setMode("daily")}
        >
          <Text style={[styles.modeTabText, mode === "daily" && styles.modeTabTextActive]}>Daily Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === "detailed" && styles.modeTabActive]}
          onPress={() => setMode("detailed")}
        >
          <Text style={[styles.modeTabText, mode === "detailed" && styles.modeTabTextActive]}>
            Employee Report
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "daily" ? (
        <>
          <DaySelector
            date={selectedDate}
            onPrev={handlePrev}
            onNext={handleNext}
            onSelectDate={setSelectedDate}
            disableNext={isToday}
          />

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(item) => item.employee._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No employees found</Text>}
              renderItem={({ item }) => (
                <EmployeeReportCard
                  employee={item.employee}
                  extraHours={item.extraHours}
                  unpaidLeaveDays={item.unpaidLeaveDays}
                  distanceKm={item.distanceKm}
                  onPress={setDetailEmployee}
                />
              )}
            />
          )}
        </>
      ) : (
        <DetailedReportPanel employees={employees} />
      )}

      <EmployeeDayDetailModal
        visible={!!detailEmployee}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        date={selectedDate}
        attendance={detailAttendance}
        trips={detailTrips}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  modeRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  modeTabActive: {
    backgroundColor: "#112250",
  },

  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  modeTabTextActive: {
    color: "#fff",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E1B4B",
  },

  loader: {
    marginTop: 40,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
  },
});
