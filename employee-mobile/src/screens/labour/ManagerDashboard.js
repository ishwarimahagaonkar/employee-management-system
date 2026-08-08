import React, { useContext, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api.js";
import DashboardStatCard from "../admin/components/DashboardStatCard";
import ErrorState from "../../components/ErrorState";
import { getApiErrorMessage } from "../../utils/apiError";

const QUICK_ACTIONS = [
  {
    route: "Leave",
    label: "Approve Requests",
    icon: "checkmark-done-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    route: "Employees",
    label: "Manage Team",
    icon: "people-outline",
    iconBg: "#EEECFF",
    iconColor: "#112250",
  },
  {
    route: "LabourReports",
    label: "Labour Reports",
    icon: "clipboard-outline",
    iconBg: "#DBEAFE",
    iconColor: "#1D4ED8",
  },
];

export default function ManagerDashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const attendance = data?.attendance || { total: 0, present: 0, absent: 0, late: 0, attendanceRate: 0 };
  const counts = data?.counts || { employees: 0, supervisors: 0, sites: 0, labour: 0 };
  const labour = data?.labour || { present: 0, absent: 0 };
  const pending = data?.pendingRequests || { total: 0, leaves: 0, emergencies: 0 };

  // The API has always returned this and the manager screen dropped it, so the
  // one role that oversees EVERY site could not see which sites had reported.
  // A supervisor sees it for their own sites already -- same shape, same
  // treatment, so the two screens now agree on what "reported" looks like.
  const todayReport = data?.todayReport || { submitted: 0, expected: 0, complete: false };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#112250"]}
            tintColor="#112250"
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#1E1B4B" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.fullName || "Manager"}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStats} compact />
        ) : (
          <>
            {/* Approvals are the one thing only a manager or admin can clear,
                so they get said out loud rather than buried in a stat tile. */}
            {pending.total > 0 && (
              <TouchableOpacity
                style={styles.banner}
                onPress={() => navigation.navigate("Leave")}
              >
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <Text style={styles.bannerText}>
                  {pending.total} request{pending.total === 1 ? "" : "s"} waiting on you
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </TouchableOpacity>
            )}

            {/* Reporting compliance across every site. Shown only while some
                site still owes a report -- once they are all in there is
                nothing to act on and the banner would be noise.
                styles.banner already carries the amber treatment here, unlike
                the supervisor screen which splits layout from colour. */}
            {!todayReport.complete && todayReport.expected > 0 && (
              <TouchableOpacity
                style={styles.banner}
                onPress={() => navigation.navigate("DailyWorkReport")}
              >
                <Ionicons name="document-text-outline" size={18} color="#D97706" />
                <Text style={styles.bannerText}>
                  {todayReport.submitted} of {todayReport.expected} site reports filed today
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                icon="people-outline"
                iconColor="#112250"
                iconBg="#EEECFF"
                value={attendance.total}
                label="Staff"
              />
              <DashboardStatCard
                icon="checkmark-circle-outline"
                iconColor="#16A34A"
                iconBg="#DCFCE7"
                value={attendance.present}
                label="Present"
              />
              <DashboardStatCard
                icon="close-circle-outline"
                iconColor="#EF4444"
                iconBg="#FEE2E2"
                value={attendance.absent}
                label="Absent"
              />
              <DashboardStatCard
                icon="alert-circle-outline"
                iconColor="#D97706"
                iconBg="#FEF3C7"
                value={attendance.late}
                label="Late"
              />
            </View>

            <Text style={styles.sectionTitle}>Team</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                icon="person-outline"
                iconColor="#112250"
                iconBg="#EEECFF"
                value={counts.employees}
                label="Employees"
              />
              <DashboardStatCard
                icon="construct-outline"
                iconColor="#1D4ED8"
                iconBg="#DBEAFE"
                value={counts.supervisors}
                label="Supervisors"
              />
              <DashboardStatCard
                icon="business-outline"
                iconColor="#15803D"
                iconBg="#DCFCE7"
                value={counts.sites}
                label="Sites"
              />
              <DashboardStatCard
                icon="hourglass-outline"
                iconColor="#D97706"
                iconBg="#FEF3C7"
                value={pending.total}
                label="Pending"
              />
            </View>

            <Text style={styles.sectionTitle}>Labour Today</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                icon="people-circle-outline"
                iconColor="#112250"
                iconBg="#EEECFF"
                value={counts.labour}
                label="Total"
              />
              <DashboardStatCard
                icon="checkmark-circle-outline"
                iconColor="#16A34A"
                iconBg="#DCFCE7"
                value={labour.present}
                label="On Site"
              />
              <DashboardStatCard
                icon="close-circle-outline"
                iconColor="#EF4444"
                iconBg="#FEE2E2"
                value={labour.absent}
                label="Absent"
              />
            </View>
          </>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 14,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    fontSize: 13,
    color: "#6B7280",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  loader: {
    marginTop: 40,
    marginBottom: 20,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
    marginHorizontal: 20,
    marginTop: 20,
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
