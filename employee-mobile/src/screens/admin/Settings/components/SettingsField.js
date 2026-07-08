import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function SettingsField({
  label,
  value,
  onChangeText,
  half,
  keyboardType,
  placeholder,
  editable = true,
}) {
  return (
    <View style={[styles.wrapper, half && styles.half]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
    width: "100%",
  },

  half: {
    width: "48%",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1E1B4B",
  },

  inputDisabled: {
    backgroundColor: "#F1F1F5",
    borderColor: "#F1F1F5",
    color: "#9CA3AF",
  },
});
