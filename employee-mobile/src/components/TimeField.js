import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

/**
 * The app's one time field. Tap to open the platform clock; never typed.
 *
 * Replaces hand-typed "09:00" inputs, which had two problems beyond being
 * awkward on a phone: every screen had to re-implement the same 4-digit
 * auto-formatting and the same HH:MM validation, and a typo only surfaced on
 * submit as "Start time must look like 09:00".
 *
 * FORMAT: the value stays a plain "HH:MM" 24-hour string. That is what
 * LabourAttendance.isValidTime accepts, what computeHours parses, and what
 * Settings stores for the working day -- so this is a change of input method
 * only. No API contract or stored format moves, and no second
 * time-calculation path is introduced.
 *
 * Built on @react-native-community/datetimepicker, which is already a
 * dependency, already declared in app.json, and already used for punch times
 * in labour AttendanceRow -- so no new native module is involved.
 */

const PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const toDate = (hhmm, fallbackHour) => {
  const date = new Date();
  const [h, m] = PATTERN.test(hhmm || "") ? hhmm.split(":").map(Number) : [fallbackHour, 0];
  date.setHours(h, m, 0, 0);
  return date;
};

const toHHMM = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function TimeField({
  label,
  value,
  onChange,
  // Where the clock opens when nothing is set yet. A start time defaulting to
  // 09:00 and an end time to 18:00 is one spin away from the common answer
  // rather than starting at whatever time it happens to be now.
  defaultHour = 9,
  placeholder = "--:--",
  hint,
  style,
}) {
  const [open, setOpen] = useState(false);

  const onPicked = (event, selected) => {
    // Android reports "dismissed" when the user backs out; iOS keeps the
    // spinner mounted, so it is closed explicitly on both paths.
    setOpen(false);

    if (event?.type === "dismissed" || !selected) return;
    onChange(toHHMM(selected));
  };

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity style={styles.input} onPress={() => setOpen(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      {open && (
        <DateTimePicker
          value={toDate(value, defaultHour)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={onPicked}
        />
      )}
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

  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },
});
