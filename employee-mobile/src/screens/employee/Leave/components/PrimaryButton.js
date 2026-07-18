import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function PrimaryButton({ label, onPress, variant = "solid", style }) {
  return (
    <TouchableOpacity
      style={[styles.base, variant === "white" ? styles.white : styles.solid, style]}
      onPress={onPress}
    >
      <Text style={variant === "white" ? styles.whiteText : styles.solidText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  solid: {
    backgroundColor: "#112250",
  },

  solidText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  white: {
    backgroundColor: "#fff",
  },

  whiteText: {
    color: "#112250",
    fontSize: 16,
    fontWeight: "700",
  },
});
