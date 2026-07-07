import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api.js";

const QUICK_ACTIONS = [
  { route: "Employees", label: "Manage Employees", icon: "people-outline" },
  { route: "Attendance", label: "Attendance Records", icon: "time-outline" },
  { route: "Payroll", label: "Salary Management", icon: "cash-outline" },
  { route: "Report", label: "Generate Reports", icon: "document-text-outline" },
];

const getTodayStr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminDashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [employeesRes, attendanceRes] = await Promise.all([
          api.get("/employees"),
          api.get("/attendance"),
        ]);

        const total = employeesRes.data?.count || 0;
        const todayStr = getTodayStr();
        const todayRecords = (attendanceRes.data?.attendance || []).filter(
          (a) => a.date === todayStr
        );

        // "approved" covers emergency requests an admin approved -- those
        // employees did attend, just via override rather than the geofence check.
        const present = todayRecords.filter(
          (a) => a.status === "present" || a.status === "approved"
        ).length;
        const late = todayRecords.filter((a) => a.status === "late").length;
        const absent = Math.max(total - present - late, 0);

        setStats({ total, present, absent, late });
      } catch (err) {
        console.log("Admin stats error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#1E1B4B" />
          </TouchableOpacity>
          <Text style={styles.welcome}>Welcome, {user?.fullName || "Admin"} !!!</Text>
        </View>
        <Text style={styles.subtitle}>Dashboard</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#6D5DF6" style={styles.loader} />
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Employees</Text>
              <Text style={styles.cardValue}>{stats.total}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Present</Text>
              <Text style={[styles.cardValue, { color: "#16A34A" }]}>{stats.present}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Absent</Text>
              <Text style={[styles.cardValue, { color: "#EF4444" }]}>{stats.absent}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Late</Text>
              <Text style={[styles.cardValue, { color: "#D97706" }]}>{stats.late}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionButton}
            onPress={() => navigation.navigate(action.route)}
          >
            <Ionicons name={action.icon} size={18} color="#483bbc" style={{ marginRight: 10 }} />
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 20,
  },

  welcome: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 14,
  },

  subtitle: {
    color: "#64748B",
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 20,
  },

  loader: {
    marginTop: 20,
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },

  cardTitle: {
    color: "#64748B",
    fontSize: 14,
  },

  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
    color: "#6D5DF6",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6c5df66d",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 12,
  },

  actionText: {
    color: "#483bbc",
    fontWeight: "600",
    fontSize: 16,
  },
});
