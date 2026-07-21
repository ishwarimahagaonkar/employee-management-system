import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default function HolidayListItem({ holiday, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="sunny" size={18} color="#112250" />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{holiday.name}</Text>
        <Text style={styles.date}>{formatDate(holiday.date)}</Text>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete?.(holiday)}>
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
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

  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  info: {
    flex: 1,
    marginRight: 8,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  date: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  deleteBtn: {
    padding: 6,
  },
});
