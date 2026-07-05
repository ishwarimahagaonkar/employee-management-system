import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TravelSummaryCard({ totalTrips, totalDistanceKm }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Travel Summary</Text>

      <View style={styles.row}>
        <View style={styles.item}>
          <View style={[styles.iconBadge, { backgroundColor: "#EDE9FE" }]}>
            <Ionicons name="navigate" size={20} color="#7C3AED" />
          </View>
          <Text style={styles.value}>{totalTrips || 0}</Text>
          <Text style={styles.label}>Total Trips</Text>
        </View>

        <View style={styles.item}>
          <View style={[styles.iconBadge, { backgroundColor: "#CCFBF1" }]}>
            <Ionicons name="location" size={20} color="#0D9488" />
          </View>
          <Text style={styles.value}>{(totalDistanceKm || 0).toFixed(1)}</Text>
          <Text style={styles.label}>Total km</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 18,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  item: {
    alignItems: "center",
  },

  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  label: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
