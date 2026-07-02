import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function SummaryCard({ todayTravel }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>Today Summary</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="list" size={28} color="#6C63FF" />
          <Text style={styles.statNumber}>
            {todayTravel?.totalTrips || 0}
          </Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="directions-car" size={28} color="#FF5B5B" />
          <Text style={styles.statNumber}>
            {todayTravel?.totalDistanceKm?.toFixed(1) || 0}
          </Text>
          <Text style={styles.statLabel}>KM</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "700", marginTop: 5 },
  statLabel: { color: "#666" },
});