import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "./PrimaryButton";
import DateField from "../../../../components/DateField";

export default function LeaveForm({
  leaveType,
  setLeaveType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  onSubmit,
  onClose,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>New Leave Request</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.pickerBox}>
        <Picker selectedValue={leaveType} onValueChange={setLeaveType} style={styles.picker}>
          <Picker.Item label="Paid Leave" value="Paid" />
          <Picker.Item label="Unpaid Leave" value="Unpaid" />
        </Picker>
      </View>

      <View style={styles.dateRow}>
        <DateField label="Start Date" value={startDate} onChange={setStartDate} />
        <DateField label="End Date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} />
      </View>

      <Text style={styles.label}>Reason</Text>
      <TextInput
        placeholder="Enter reason for leave..."
        placeholderTextColor="#9CA3AF"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textarea]}
      />

      <PrimaryButton label="Submit Request" onPress={onSubmit} style={styles.submitBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  pickerBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
    overflow: "hidden",
  },

  picker: {
    color: "#1E1B4B",
  },

  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
    marginBottom: 16,
  },

  textarea: {
    height: 90,
    textAlignVertical: "top",
  },

  submitBtn: {
    marginTop: 4,
  },
});
