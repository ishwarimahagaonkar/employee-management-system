import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TravelSummaryCards({ totalDistanceKm, activeTripsCount, completedTripsCount }) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={[styles.value, { color: "#7C3AED" }]}>{totalDistanceKm} km</Text>
        <Text style={styles.label}>Total Distance</Text>
      </View>
      <View style={styles.card}>
        <Text style={[styles.value, { color: "#2563EB" }]}>{activeTripsCount}</Text>
        <Text style={styles.label}>Active Trips</Text>
      </View>
      <View style={styles.card}>
        <Text style={[styles.value, { color: "#16A34A" }]}>{completedTripsCount}</Text>
        <Text style={styles.label}>Completed Trips</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 1,
  },

  value: {
    fontSize: 18,
    fontWeight: "700",
  },

  label: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
});
