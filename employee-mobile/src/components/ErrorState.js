import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Shown when a data fetch fails, so a failure never looks like an empty list.
export default function ErrorState({ message, onRetry, compact }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={compact ? 20 : 26} color="#DC2626" />
      </View>

      <Text style={styles.title}>Couldn't load data</Text>
      <Text style={styles.message}>{message}</Text>

      {!!onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 28,
  },

  wrapCompact: {
    paddingVertical: 20,
  },

  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 4,
  },

  message: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#112250",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },

  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
