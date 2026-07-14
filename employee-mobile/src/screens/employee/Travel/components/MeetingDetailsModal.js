import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const emptyForm = { customerName: "", meetingStartTime: "", meetingEndTime: "", notes: "" };

export default function MeetingDetailsModal({ visible, loading, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const isValid =
    form.customerName.trim() && form.meetingStartTime.trim() && form.meetingEndTime.trim() && form.notes.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(form);
    setForm(emptyForm);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Meeting Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.helper}>
            Add details about the meeting for your last trip.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={styles.input}
              value={form.customerName}
              onChangeText={update("customerName")}
              placeholder="e.g. Acme Corp"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.meetingStartTime}
                  onChangeText={update("meetingStartTime")}
                  placeholder="e.g. 2:30 PM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.timeCol}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.meetingEndTime}
                  onChangeText={update("meetingEndTime")}
                  placeholder="e.g. 3:00 PM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.notes}
              onChangeText={update("notes")}
              placeholder="What was discussed..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
            >
              <Text style={styles.submitText}>{loading ? "Saving..." : "Save Meeting Details"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  helper: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 18,
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
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
    marginBottom: 16,
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeCol: {
    flex: 1,
  },

  textarea: {
    height: 90,
    textAlignVertical: "top",
  },

  submitBtn: {
    backgroundColor: "#6C63FF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  submitBtnDisabled: {
    opacity: 0.5,
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
