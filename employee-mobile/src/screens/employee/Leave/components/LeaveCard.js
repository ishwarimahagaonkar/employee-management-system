import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LeaveCard({ count, label }) {
  return (
    <View style={styles.card}>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 5,
  },

  count: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
});
