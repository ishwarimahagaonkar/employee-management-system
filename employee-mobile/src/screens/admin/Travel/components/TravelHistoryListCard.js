import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATUS_STYLE = {
  "in-progress": { bg: "#DBEAFE", text: "#2563EB", label: "In Progress" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Completed" },
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function TravelHistoryListCard({ trip, onPress }) {
  const status = STATUS_STYLE[trip.status] || STATUS_STYLE.completed;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(trip)} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(trip.employee?.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{trip.employee?.fullName || "Unknown"}</Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.purpose} numberOfLines={1}>{trip.purpose}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(trip.date)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formatTime(trip.startTime)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>
            {trip.status === "in-progress" ? "-" : `${trip.distanceKm || 0} km`}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#C4C4CC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: 13,
  },

  info: {
    flex: 1,
    marginRight: 8,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    flexShrink: 1,
    marginRight: 8,
  },

  purpose: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  metaText: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  metaDot: {
    fontSize: 12,
    color: "#D1D5DB",
    marginHorizontal: 6,
  },
});
