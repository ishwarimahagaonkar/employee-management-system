import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import EmployeeAttendanceRow from "./components/EmployeeAttendanceRow";
import EmergencyRequestCard from "./components/EmergencyRequestCard";
import AttendancePhotoModal from "./components/AttendancePhotoModal";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

const getTodayStr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AttendanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tab, setTab] = useState("today");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);

      const [employeesRes, attendanceRes] = await Promise.all([
        api.get("/employees"),
        api.get("/attendance"),
      ]);

      setEmployees(employeesRes.data?.employees || []);
      setAttendance(attendanceRes.data?.attendance || []);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayStr = getTodayStr();
  const todayRecords = attendance.filter((a) => a.date === todayStr);
  const pendingRequests = attendance.filter(
    (a) => a.emergencyRequest && a.status === "pending"
  );

  // "approved" covers emergency requests an admin approved -- those
  // employees did attend, just via override rather than the geofence check.
  const presentCount = todayRecords.filter(
    (a) => a.status === "present" || a.status === "approved"
  ).length;
  const lateCount = todayRecords.filter((a) => a.status === "late").length;
  const pendingCount = todayRecords.filter((a) => a.status === "pending").length;
  const absentCount = Math.max(employees.length - presentCount - lateCount - pendingCount, 0);

  const resolveEmergency = async (record, action) => {
    // Ignore taps while another decision is still being saved.
    if (pending) return;

    try {
      setPending({ id: record._id, action });

      const res = await api.put(`/attendance/emergency/${record._id}`, { action });
      const updated = res.data?.attendance;

      // Patch the one record locally instead of refetching both lists -- the
      // decision then lands immediately rather than after two more requests.
      // userId is kept from the existing row because the response returns it
      // unpopulated (an id, not the employee object the list renders).
      if (updated?._id) {
        setAttendance((prev) =>
          prev.map((a) =>
            a._id === updated._id ? { ...a, ...updated, userId: a.userId } : a
          )
        );
      } else {
        await fetchData();
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  const handleRowPress = (employee, record) => {
    setSelectedEmployee(employee);
    setSelectedRecord(record);
    setPhotoModalVisible(true);
  };

  const handleApprove = (record) => resolveEmergency(record, "approve");

  const handleReject = (record) => {
    if (Platform.OS === "web") {
      if (window.confirm("Reject this emergency request?")) {
        resolveEmergency(record, "reject");
      }
      return;
    }

    Alert.alert("Reject Request", "Reject this emergency request?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => resolveEmergency(record, "reject") },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#16A34A" }]}>{presentCount}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#D97706" }]}>{lateCount}</Text>
          <Text style={styles.summaryLabel}>Late</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#DC2626" }]}>{absentCount}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "today" && styles.tabActive]}
          onPress={() => setTab("today")}
        >
          <Text style={[styles.tabText, tab === "today" && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "emergency" && styles.tabActive]}
          onPress={() => setTab("emergency")}
        >
          <Text style={[styles.tabText, tab === "emergency" && styles.tabTextActive]}>
            Emergency Requests{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : tab === "today" ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#112250"]} tintColor="#112250" />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No employees found</Text>}
          renderItem={({ item }) => (
            <EmployeeAttendanceRow
              employee={item}
              record={todayRecords.find((a) => a.userId?._id === item._id)}
              onPress={handleRowPress}
            />
          )}
        />
      ) : (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#112250"]} tintColor="#112250" />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No pending emergency requests</Text>}
          renderItem={({ item }) => (
            <EmergencyRequestCard
              record={item}
              onApprove={handleApprove}
              onReject={handleReject}
              pendingAction={pending?.id === item._id ? pending.action : null}
            />
          )}
        />
      )}

      <AttendancePhotoModal
        visible={photoModalVisible}
        employee={selectedEmployee}
        record={selectedRecord}
        onClose={() => setPhotoModalVisible(false)}
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

  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 1,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#EEECFF",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: "#112250",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#112250",
  },

  tabTextActive: {
    color: "#fff",
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
