import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import MonthSelector from "./components/MonthSelector";
import EmployeeReportCard from "./components/EmployeeReportCard";

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

const pad2 = (n) => String(n).padStart(2, "0");

export default function ReportScreen({ navigation }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [trips, setTrips] = useState([]);

  const fetchData = async () => {
    try {
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
      console.log("Report fetch error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const monthPrefix = `${year}-${pad2(month)}`;

  const handlePrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const reportRows = employees.map((employee) => {
    const extraHours = attendance
      .filter((a) => a.userId?._id === employee._id && a.date?.startsWith(monthPrefix) && a.punchOutTime)
      .reduce((sum, a) => sum + extraHoursFor(a.punchOutTime), 0);

    const unpaidLeaveDays = leaves
      .filter(
        (l) =>
          l.userId?._id === employee._id &&
          l.leaveType === "Unpaid" &&
          l.status === "Approved" &&
          l.startDate?.startsWith(monthPrefix)
      )
      .reduce((sum, l) => sum + (l.totalDays || 0), 0);

    const distanceKm = trips
      .filter(
        (t) =>
          t.employee?._id === employee._id &&
          t.startTime &&
          t.startTime.startsWith(monthPrefix)
      )
      .reduce((sum, t) => sum + (t.distanceKm || 0), 0);

    return { employee, extraHours, unpaidLeaveDays, distanceKm };
  });

  const filteredRows = reportRows.filter((row) =>
    row.employee.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <MonthSelector
        month={month}
        year={year}
        onPrev={handlePrev}
        onNext={handleNext}
        disableNext={isCurrentMonth}
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
        <ActivityIndicator size="large" color="#6D5DF6" style={styles.loader} />
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
            />
          )}
        />
      )}
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
