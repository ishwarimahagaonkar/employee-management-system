import React, { useCallback, useContext, useState } from "react";
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

import { AuthContext } from "../../../context/AuthContext";
import api from "../../../api/api.js";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

const PLAN_ORDER = ["Standard", "Premium"];

const STATUS_META = {
  active: { color: "#16A34A", bg: "#DCFCE7", icon: "checkmark-circle-outline", label: "Active" },
  trial: { color: "#D97706", bg: "#FEF3C7", icon: "time-outline", label: "Trial" },
  suspended: { color: "#EF4444", bg: "#FEE2E2", icon: "pause-circle-outline", label: "Suspended" },
  expired: { color: "#6B7280", bg: "#F3F4F6", icon: "close-circle-outline", label: "Expired" },
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const formatShortDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "-";

export default function SuperAdminDashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchCompanies = useCallback(async ({ silent } = {}) => {
    if (silent) setRefreshing(true);
    try {
      setError(null);
      const res = await api.get("/companies");
      setCompanies(res.data?.companies || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const retry = () => {
    setLoading(true);
    fetchCompanies();
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
    }, [fetchCompanies])
  );

  const statusCounts = companies.reduce(
    (acc, c) => {
      const status = c.subscription?.status || "trial";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { active: 0, trial: 0, suspended: 0, expired: 0 }
  );

  const totalCapacity = companies.reduce((sum, c) => sum + (c.subscription?.employeeLimit || 0), 0);

  const planCounts = PLAN_ORDER.reduce((acc, plan) => {
    acc[plan] = companies.filter((c) => (c.subscription?.plan || "Premium") === plan).length;
    return acc;
  }, {});
  const maxPlanCount = Math.max(1, ...Object.values(planCounts));

  const expiringSoon = companies
    .filter((c) => {
      const d = daysUntil(c.subscription?.endDate);
      return d !== null && d >= 0 && d <= 30 && !["expired", "suspended"].includes(c.subscription?.status);
    })
    .sort((a, b) => daysUntil(a.subscription.endDate) - daysUntil(b.subscription.endDate))
    .slice(0, 5);

  const recentCompanies = companies.slice(0, 5);

  const openCompany = (company) => navigation.navigate("Companies", {
    screen: "CompanyDetail",
    params: { companyId: company._id },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchCompanies({ silent: true })} />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconBtn}>
            <Ionicons name="menu" size={20} color="#1E1B4B" />
          </TouchableOpacity>
          <Text style={styles.screenLabel}>Dashboard</Text>
          <TouchableOpacity
            onPress={() => fetchCompanies({ silent: true })}
            style={styles.iconBtn}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#112250" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#1E1B4B" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroGreeting}>Welcome back</Text>
            <Text style={styles.heroName}>{user?.fullName || "Super Admin"}</Text>
          </View>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials(user?.fullName)}</Text>
          </View>
        </View>

        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <View style={[styles.chip, styles.chipPrimary]}>
                <Ionicons name="business" size={16} color="#fff" />
                <Text style={styles.chipValuePrimary}>{companies.length}</Text>
                <Text style={styles.chipLabelPrimary}>Companies</Text>
              </View>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <View key={key} style={[styles.chip, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                  <Text style={[styles.chipValue, { color: meta.color }]}>{statusCounts[key] || 0}</Text>
                  <Text style={[styles.chipLabel, { color: meta.color }]}>{meta.label}</Text>
                </View>
              ))}
              <View style={[styles.chip, styles.chipNeutral]}>
                <Ionicons name="people-outline" size={16} color="#374151" />
                <Text style={styles.chipValueNeutral}>{totalCapacity}</Text>
                <Text style={styles.chipLabelNeutral}>Seat Capacity</Text>
              </View>
            </ScrollView>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Distribution</Text>
              {PLAN_ORDER.map((plan) => (
                <View key={plan} style={styles.planRow}>
                  <Text style={styles.planLabel}>{plan}</Text>
                  <View style={styles.planBarTrack}>
                    <View
                      style={[
                        styles.planBarFill,
                        { width: `${(planCounts[plan] / maxPlanCount) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.planCount}>{planCounts[plan]}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Expiring Soon</Text>
                <Text style={styles.sectionCaption}>Next 30 days</Text>
              </View>
              {expiringSoon.length === 0 ? (
                <Text style={styles.emptyText}>Nothing expiring in the next 30 days</Text>
              ) : (
                expiringSoon.map((c) => {
                  const d = daysUntil(c.subscription.endDate);
                  return (
                    <TouchableOpacity key={c._id} style={styles.listRow} onPress={() => openCompany(c)}>
                      <View style={styles.listAvatar}>
                        <Text style={styles.listAvatarText}>{initials(c.name)}</Text>
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listName}>{c.name}</Text>
                        <Text style={styles.listMeta}>{c.subscription?.plan} plan</Text>
                      </View>
                      <View style={[styles.expiryPill, d <= 7 && styles.expiryPillUrgent]}>
                        <Text style={[styles.expiryPillText, d <= 7 && styles.expiryPillTextUrgent]}>
                          {d === 0 ? "Today" : `${d}d left`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              {recentCompanies.length === 0 ? (
                <Text style={styles.emptyText}>No companies yet</Text>
              ) : (
                recentCompanies.map((c) => {
                  const meta = STATUS_META[c.subscription?.status] || STATUS_META.trial;
                  return (
                    <TouchableOpacity key={c._id} style={styles.listRow} onPress={() => openCompany(c)}>
                      <View style={styles.listAvatar}>
                        <Text style={styles.listAvatarText}>{initials(c.name)}</Text>
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listName}>{c.name}</Text>
                        <Text style={styles.listMeta}>Added {formatShortDate(c.createdAt)}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Companies")}>
            <View style={[styles.actionIcon, { backgroundColor: "#EEECFF" }]}>
              <Ionicons name="business-outline" size={20} color="#112250" />
            </View>
            <Text style={styles.actionText}>Manage Companies</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
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

  scrollContent: {
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  screenLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#112250",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 18,
  },

  heroGreeting: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },

  heroName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },

  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroAvatarText: {
    color: "#fff",
    fontWeight: "700",
  },

  lastUpdated: {
    fontSize: 11,
    color: "#9CA3AF",
    marginHorizontal: 20,
    marginTop: 10,
  },

  loader: {
    marginTop: 40,
    marginBottom: 20,
  },

  chipRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },

  chip: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 92,
    alignItems: "flex-start",
  },

  chipPrimary: {
    backgroundColor: "#112250",
  },

  chipNeutral: {
    backgroundColor: "#EEF2F7",
  },

  chipValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },

  chipLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },

  chipValuePrimary: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    color: "#fff",
  },

  chipLabelPrimary: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
    color: "rgba(255,255,255,0.75)",
  },

  chipValueNeutral: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    color: "#374151",
  },

  chipLabelNeutral: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
    color: "#6B7280",
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 12,
  },

  sectionCaption: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 10,
  },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  planLabel: {
    width: 78,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  planBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F1F5",
    overflow: "hidden",
    marginHorizontal: 10,
  },

  planBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#112250",
  },

  planCount: {
    width: 20,
    fontSize: 12,
    fontWeight: "700",
    color: "#1E1B4B",
    textAlign: "right",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  listAvatarText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 12,
  },

  listInfo: {
    flex: 1,
  },

  listName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  listMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },

  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  expiryPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FEF3C7",
  },

  expiryPillUrgent: {
    backgroundColor: "#FEE2E2",
  },

  expiryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },

  expiryPillTextUrgent: {
    color: "#EF4444",
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionText: {
    flex: 1,
    color: "#1E1B4B",
    fontWeight: "600",
    fontSize: 14,
  },
});
