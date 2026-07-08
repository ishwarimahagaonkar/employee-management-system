import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthSelector({ month, year, onPrev, onNext, disableNext }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.arrowBtn} onPress={onPrev}>
        <Ionicons name="chevron-back" size={20} color="#6D5DF6" />
      </TouchableOpacity>

      <Text style={styles.label}>
        {MONTH_NAMES[month - 1]} {year}
      </Text>

      <TouchableOpacity
        style={[styles.arrowBtn, disableNext && styles.arrowBtnDisabled]}
        onPress={onNext}
        disabled={disableNext}
      >
        <Ionicons name="chevron-forward" size={20} color={disableNext ? "#D1D5DB" : "#6D5DF6"} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  arrowBtnDisabled: {
    backgroundColor: "#F4F6F8",
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginHorizontal: 20,
    minWidth: 140,
    textAlign: "center",
  },
});
