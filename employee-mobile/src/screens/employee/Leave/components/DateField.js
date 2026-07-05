import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

const formatDisplay = (iso) => {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
};

export default function DateField({ label, value, onChange, minDate }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDisplay(value) : "dd-mm-yyyy"}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
            <Calendar
              current={value || undefined}
              minDate={minDate}
              onDayPress={(day) => {
                onChange(day.dateString);
                setVisible(false);
              }}
              markedDates={value ? { [value]: { selected: true, selectedColor: "#6D5DF6" } } : {}}
              theme={{
                todayTextColor: "#6D5DF6",
                selectedDayBackgroundColor: "#6D5DF6",
                arrowColor: "#6D5DF6",
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },

  placeholderText: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  valueText: {
    fontSize: 14,
    color: "#1E1B4B",
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  calendarCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
  },
});
