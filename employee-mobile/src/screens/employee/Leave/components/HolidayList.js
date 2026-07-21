import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
};

export default function HolidayList({ holidays }) {
  if (!holidays.length) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="sunny" size={16} color="#112250" />
        <Text style={styles.title}>Holidays</Text>
      </View>

      {holidays.map((h) => (
        <View key={h._id} style={styles.row}>
          <Text style={styles.date}>{formatDate(h.date)}</Text>
          <Text style={styles.name} numberOfLines={1}>{h.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginLeft: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },

  date: {
    fontSize: 12,
    fontWeight: "600",
    color: "#112250",
    width: 110,
  },

  name: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
});
