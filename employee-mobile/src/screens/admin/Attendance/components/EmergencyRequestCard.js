import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export default function EmergencyRequestCard({ record, onApprove, onReject }) {
  const currentAddress =
    record.punchOutLocation?.address || record.punchInLocation?.address;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{record.userId?.fullName || "Unknown Employee"}</Text>
          <Text style={styles.date}>{formatDate(record.date)}</Text>
        </View>
      </View>

      <Text style={styles.reasonLabel}>Reason</Text>
      <Text style={styles.reason}>{record.emergencyReason || "No reason provided"}</Text>

      {currentAddress && (
        <>
          <Text style={styles.reasonLabel}>Current Location</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#9CA3AF" style={styles.locationIcon} />
            <Text style={styles.reason}>{currentAddress}</Text>
          </View>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(record)}>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(record)}>
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
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

  date: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  reasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  reason: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
    marginBottom: 14,
    flex: 1,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  locationIcon: {
    marginTop: 5,
    marginRight: 4,
  },

  actions: {
    flexDirection: "row",
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },

  rejectBtn: {
    backgroundColor: "#FEE2E2",
    marginRight: 8,
  },

  rejectText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },

  approveBtn: {
    backgroundColor: "#DCFCE7",
  },

  approveText: {
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 13,
  },
});
