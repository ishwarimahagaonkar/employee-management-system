import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateShort } from "../../../../utils/formatDate";

const TYPE_ICON = {
  Paid: "cash-outline",
  Unpaid: "remove-circle-outline",
};

const STATUS_STYLE = {
  Pending: { bg: "#FEF3C7", text: "#D97706" },
  Approved: { bg: "#DCFCE7", text: "#16A34A" },
  Rejected: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function LeaveHistoryCard({ leave, onCancel }) {
  const statusStyle = STATUS_STYLE[leave.status] || STATUS_STYLE.Pending;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name={TYPE_ICON[leave.leaveType] || "calendar-outline"} size={18} color="#3B82F6" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{leave.leaveType} Leave</Text>
          <Text style={styles.subtitle}>{leave.totalDays} days</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{leave.status}</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateValue}>{formatDateShort(leave.startDate)}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateValue}>{formatDateShort(leave.endDate)}</Text>
        </View>
      </View>

      {!!leave.reason && <Text style={styles.reason}>{leave.reason}</Text>}

      {leave.status === "Pending" && (
        <TouchableOpacity onPress={() => onCancel(leave._id)}>
          <Text style={styles.cancelText}>Cancel Leave</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
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
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titleBlock: {
    flex: 1,
  },

  title: {
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  dateRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  dateBlock: {
    flex: 1,
  },

  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 2,
  },

  reason: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
  },

  cancelText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626ac",
  },
});
