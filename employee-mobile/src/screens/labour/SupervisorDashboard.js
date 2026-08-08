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
import SiteHeader from "../../components/SiteHeader";
import { getApiErrorMessage } from "../../utils/apiError";

const QUICK_ACTIONS = [
  {
    route: "LabourAttendance",
    label: "Mark Labour Attendance",
    icon: "time-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    route: "DailyWorkReport",
    label: "Daily Work Report",
    icon: "create-outline",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
  },
  {
    route: "Labour",
    label: "Manage Labour",
    icon: "people-circle-outline",
    iconBg: "#EEECFF",
    iconColor: "#112250",
  },
];

export default function SupervisorDashboard({ navigation }) {
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

  // Refetched on focus rather than once on mount: a supervisor comes back here
  // straight after marking attendance, and stale counts would look like the
  // save hadn't worked.
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

  const sites = data?.sites || { total: 0, active: 0 };
  const labour = data?.labour || { total: 0, present: 0, absent: 0, unmarked: 0, pendingPunchOuts: 0 };
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
            <Text style={styles.name}>{user?.fullName || "Supervisor"}</Text>
          </View>
        </View>

        <SiteHeader onSiteChange={fetchStats} />

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStats} compact />
        ) : (
          <>
            {/* The day's outstanding work, stated plainly rather than left for
                the supervisor to infer from the numbers below. */}
            {labour.unmarked > 0 && (
              <TouchableOpacity
                style={[styles.banner, styles.bannerWarning]}
                onPress={() => navigation.navigate("LabourAttendance")}
              >
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <Text style={styles.bannerText}>
                  {labour.unmarked} labourer{labour.unmarked === 1 ? "" : "s"} not marked today
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </TouchableOpacity>
            )}

            {labour.pendingPunchOuts > 0 && (
              <TouchableOpacity
                style={[styles.banner, styles.bannerInfo]}
                onPress={() => navigation.navigate("LabourAttendance")}
              >
                <Ionicons name="time-outline" size={18} color="#1D4ED8" />
                <Text style={[styles.bannerText, styles.bannerTextInfo]}>
                  {labour.pendingPunchOuts} still clocked in
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
              </TouchableOpacity>
            )}

            {!todayReport.complete && todayReport.expected > 0 && (
              <TouchableOpacity
                style={[styles.banner, styles.bannerWarning]}
                onPress={() => navigation.navigate("DailyWorkReport")}
              >
                <Ionicons name="document-text-outline" size={18} color="#D97706" />
                <Text style={styles.bannerText}>
                  {todayReport.submitted} of {todayReport.expected} daily reports filed
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Today's Labour</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                icon="people-circle-outline"
                iconColor="#112250"
                iconBg="#EEECFF"
                value={labour.total}
                label="Total"
              />
              <DashboardStatCard
                icon="checkmark-circle-outline"
                iconColor="#16A34A"
                iconBg="#DCFCE7"
                value={labour.present}
                label="Present"
              />
              <DashboardStatCard
                icon="close-circle-outline"
                iconColor="#EF4444"
                iconBg="#FEE2E2"
                value={labour.absent}
                label="Absent"
              />
              <DashboardStatCard
                icon="time-outline"
                iconColor="#1D4ED8"
                iconBg="#DBEAFE"
                value={labour.pendingPunchOuts}
                label="Clocked In"
              />
            </View>

            <Text style={styles.sectionTitle}>My Sites</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                icon="business-outline"
                iconColor="#1D4ED8"
                iconBg="#DBEAFE"
                value={sites.active}
                label="Active Sites"
              />
              <DashboardStatCard
                icon="document-text-outline"
                iconColor={todayReport.complete ? "#16A34A" : "#D97706"}
                iconBg={todayReport.complete ? "#DCFCE7" : "#FEF3C7"}
                value={todayReport.submitted}
                label="Reports Filed"
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
  },

  bannerWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  bannerInfo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },

  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },

  bannerTextInfo: {
    color: "#1D4ED8",
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
