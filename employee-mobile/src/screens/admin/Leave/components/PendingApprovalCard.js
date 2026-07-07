import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export default function PendingApprovalCard({ leave, onApprove, onReject }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="calendar-outline" size={20} color="#0891B2" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{leave.userId?.fullName || "Unknown Employee"}</Text>
          <Text style={styles.subtitle}>
            {leave.leaveType} Leave - {leave.totalDays} days
          </Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Start Date</Text>
          <Text style={styles.dateValue}>{formatDate(leave.startDate)}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>End Date</Text>
          <Text style={styles.dateValue}>{formatDate(leave.endDate)}</Text>
        </View>
      </View>

      <Text style={styles.reasonLabel}>Reason</Text>
      <Text style={styles.reason}>{leave.reason}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(leave)}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.btnIcon} />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(leave)}>
          <Ionicons name="close-circle" size={18} color="#DC2626" style={styles.btnIcon} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#CFFAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titleBlock: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  subtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  statusPill: {
    backgroundColor: "#CFFAFE",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0891B2",
  },

  dateRow: {
    flexDirection: "row",
    marginBottom: 14,
  },

  dateBlock: {
    flex: 1,
  },

  dateLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 2,
  },

  reasonLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  reason: {
    fontSize: 14,
    color: "#1E1B4B",
    marginTop: 2,
    marginBottom: 18,
  },

  actions: {
    flexDirection: "row",
  },

  approveBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#6D5DF6",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  approveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  rejectText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
  },

  btnIcon: {
    marginRight: 6,
  },
});
