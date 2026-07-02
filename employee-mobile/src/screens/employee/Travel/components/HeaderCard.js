    import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HeaderCard({
  activeTrip,
  currentPurpose,
  onStartPress,
  onEndPress,
}) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.heading}>Travel</Text>

      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <Ionicons name="car-outline" size={24} color="#fff" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.locationTitle}>Trip Tracker</Text>
            <Text style={styles.locationSubTitle}>
              {activeTrip ? currentPurpose : "Track your daily movement"}
            </Text>
          </View>
        </View>

        <View style={styles.mapPlaceholder}>
          <Text style={{ color: "#fff" }}>
            {activeTrip ? "🟢 Trip Active" : "🔴 No Active Trip"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.punchButton}
          onPress={activeTrip ? onEndPress : onStartPress}
        >
          <Text style={styles.punchText}>
            {activeTrip ? "End Trip" : "Start Trip"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "#6C63FF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  heading: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 25,
  },
  locationContainer: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 24,
    padding: 20,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  locationTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  locationSubTitle: { color: "#E6E6FA", fontSize: 13 },
  mapPlaceholder: {
    height: 120,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  punchButton: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  punchText: {
    color: "#6C63FF",
    fontWeight: "700",
    fontSize: 18,
  },
});