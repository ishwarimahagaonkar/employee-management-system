import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LeaveStatCard({ value, label, color }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 22,
    fontWeight: "700",
  },

  label: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
