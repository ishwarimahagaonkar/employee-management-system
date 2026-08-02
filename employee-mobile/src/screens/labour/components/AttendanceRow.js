import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Types "0900" as "09:00" so a supervisor filling in a whole crew never has to
// reach for the colon key.
const formatTimeInput = (raw, previous) => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);

  // Deleting back through the colon must not immediately re-add it.
  if (raw.length < previous.length && raw.endsWith(":")) return raw.slice(0, -1);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export default function AttendanceRow({ row, onChange }) {
  const { labour, present, punchIn, punchOut, editable, workingHours } = row;

  const setField = (key) => (value) => onChange(labour._id, { [key]: value });

  const setPresent = (value) => {
    // Clearing the times on absent mirrors what the server stores, so the row
    // can't display hours for someone marked absent.
    onChange(labour._id, value
      ? { present: true }
      : { present: false, punchIn: "", punchOut: "" });
  };

  return (
    <View style={[styles.card, !editable && styles.cardLocked]}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{labour.fullName}</Text>
          <Text style={styles.labourId}>{labour.labourId}</Text>
        </View>

        {editable ? (
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, present && styles.presentActive]}
              onPress={() => setPresent(true)}
            >
              <Text style={[styles.toggleText, present && styles.presentActiveText]}>P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, !present && styles.absentActive]}
              onPress={() => setPresent(false)}
            >
              <Text style={[styles.toggleText, !present && styles.absentActiveText]}>A</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color="#6B7280" />
            <Text style={styles.lockedText}>{present ? "Present" : "Absent"}</Text>
          </View>
        )}
      </View>

      {present && (
        <View style={styles.timeRow}>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>In</Text>
            <TextInput
              style={[styles.timeInput, !editable && styles.timeInputLocked]}
              value={punchIn || ""}
              onChangeText={(v) => setField("punchIn")(formatTimeInput(v, punchIn || ""))}
              placeholder="09:00"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={5}
              editable={editable}
            />
          </View>

          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Out</Text>
            <TextInput
              style={[styles.timeInput, !editable && styles.timeInputLocked]}
              value={punchOut || ""}
              onChangeText={(v) => setField("punchOut")(formatTimeInput(v, punchOut || ""))}
              placeholder="18:00"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={5}
              editable={editable}
            />
          </View>

          <View style={styles.hoursCol}>
            <Text style={styles.timeLabel}>Hours</Text>
            <Text style={styles.hoursValue}>
              {workingHours ? workingHours.toFixed(2) : "--"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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

  cardLocked: {
    backgroundColor: "#F8FAFC",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  labourId: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  toggle: {
    flexDirection: "row",
    gap: 8,
  },

  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  toggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  presentActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  presentActiveText: {
    color: "#15803D",
  },

  absentActive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },

  absentActiveText: {
    color: "#B91C1C",
  },

  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },

  lockedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },

  timeCol: {
    flex: 1,
  },

  hoursCol: {
    width: 60,
    alignItems: "center",
  },

  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },

  timeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E1B4B",
    textAlign: "center",
  },

  timeInputLocked: {
    color: "#9CA3AF",
  },

  hoursValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#112250",
    paddingVertical: 10,
  },
});
