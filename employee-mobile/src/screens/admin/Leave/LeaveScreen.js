import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import LeaveStatCard from "./components/LeaveStatCard";
import PendingApprovalCard from "./components/PendingApprovalCard";
import LeaveHistoryCard from "./components/LeaveHistoryCard";

export default function LeaveScreen({ navigation }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave");
      setLeaves(res.data?.data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const daysFor = (status) =>
    leaves
      .filter((l) => l.status === status)
      .reduce((sum, l) => sum + (l.totalDays || 0), 0);

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");
  const pendingDays = daysFor("Pending");
  const approvedDays = daysFor("Approved");
  const rejectedDays = daysFor("Rejected");

  const updateStatus = async (leave, status) => {
    try {
      await api.patch(`/leave/${leave._id}/status`, { status });
      fetchLeaves();
    } catch (err) {
      Alert.alert("Error", "Failed to update leave status");
    }
  };

  const handleApprove = (leave) => updateStatus(leave, "Approved");
  const handleReject = (leave) => updateStatus(leave, "Rejected");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.statsRow}>
                <LeaveStatCard value={pendingDays} label="Pending Days" color="#0891B2" />
                <LeaveStatCard value={approvedDays} label="Approved Days" color="#16A34A" />
                <LeaveStatCard value={rejectedDays} label="Rejected Days" color="#DC2626" />
              </View>

              <Text style={styles.sectionTitle}>Pending Approvals</Text>

              {pendingLeaves.length === 0 ? (
                <Text style={styles.emptyText}>No pending leave requests</Text>
              ) : (
                pendingLeaves.map((leave) => (
                  <PendingApprovalCard
                    key={leave._id}
                    leave={leave}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))
              )}

              <Text style={styles.sectionTitle}>Leave History</Text>
            </>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No leave records found</Text>}
          renderItem={({ item }) => <LeaveHistoryCard leave={item} />}
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

  loader: {
    marginTop: 40,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  statsRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 14,
    marginTop: 4,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    color: "#9CA3AF",
  },
});
