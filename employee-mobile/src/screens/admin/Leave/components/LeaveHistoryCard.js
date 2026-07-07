import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATUS_STYLE = {
  Pending: { bg: "#CFFAFE", text: "#0891B2" },
  Approved: { bg: "#DCFCE7", text: "#16A34A" },
  Rejected: { bg: "#FEE2E2", text: "#DC2626" },
};

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export default function LeaveHistoryCard({ leave }) {
  const statusStyle = STATUS_STYLE[leave.status] || STATUS_STYLE.Pending;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="person-outline" size={18} color="#6D5DF6" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{leave.userId?.fullName || "Unknown Employee"}</Text>
          <Text style={styles.subtitle}>
            {leave.leaveType} Leave - {leave.totalDays} days
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{leave.status}</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateValue}>{formatDate(leave.startDate)}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateValue}>{formatDate(leave.endDate)}</Text>
        </View>
      </View>

      {!!leave.reason && <Text style={styles.reason}>{leave.reason}</Text>}
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
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titleBlock: {
    flex: 1,
  },

  name: {
    fontSize: 14,
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
    color: "#6D5DF6",
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
});
