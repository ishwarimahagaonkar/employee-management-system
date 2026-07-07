import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function ActiveTripCard({ trip }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="navigate" size={16} color="#2563EB" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{trip.employee?.fullName || "Unknown"}</Text>
          <Text style={styles.purpose}>{trip.purpose}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.started}>Started: {formatTime(trip.startTime)}</Text>
        <Text style={styles.distance}>{trip.distanceKm || 0} km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
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

  purpose: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  started: {
    fontSize: 12,
    color: "#6B7280",
  },

  distance: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
});
