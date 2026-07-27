import React, { useContext, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api.js";
import AdminDashboardHeader from "./components/AdminDashboardHeader";
import DashboardStatCard from "./components/DashboardStatCard";
import ErrorState from "../../components/ErrorState";
import { getApiErrorMessage } from "../../utils/apiError";

const QUICK_ACTIONS = [
  {
    route: "Employees",
    label: "Manage Employees",
    icon: "people-outline",
    iconBg: "#EEECFF",
    iconColor: "#112250",
  },
  {
    route: "Attendance",
    label: "Attendance Records",
    icon: "time-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    route: "Report",
    label: "Generate Reports",
    icon: "document-text-outline",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
  },
];

const getTodayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminDashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
      try {
        setError(null);
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
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const retry = () => {
    setLoading(true);
    fetchStats();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const attendanceRate =
    stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#112250"]} tintColor="#112250" />
        }
      >
        <AdminDashboardHeader
          name={user?.fullName || "Admin"}
          onMenuPress={() => navigation.openDrawer()}
          attendanceRate={attendanceRate}
          showProgress={!loading}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} compact />
        ) : (
          <View style={styles.statsGrid}>
            <DashboardStatCard
              icon="people-outline"
              iconColor="#112250"
              iconBg="#EEECFF"
              value={stats.total}
              label="Employees"
            />
            <DashboardStatCard
              icon="checkmark-circle-outline"
              iconColor="#16A34A"
              iconBg="#DCFCE7"
              value={stats.present}
              label="Present"
            />
            <DashboardStatCard
              icon="close-circle-outline"
              iconColor="#EF4444"
              iconBg="#FEE2E2"
              value={stats.absent}
              label="Absent"
            />
            <DashboardStatCard
              icon="alert-circle-outline"
              iconColor="#D97706"
              iconBg="#FEF3C7"
              value={stats.late}
              label="Late"
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsList}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.route)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.iconBg }]}>
                <Ionicons name={action.icon} size={20} color={action.iconColor} />
              </View>
              <Text style={styles.actionText}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  loader: {
    marginTop: 40,
    marginBottom: 20,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },

  actionsList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionText: {
    flex: 1,
    color: "#1E1B4B",
    fontWeight: "600",
    fontSize: 15,
  },
});
