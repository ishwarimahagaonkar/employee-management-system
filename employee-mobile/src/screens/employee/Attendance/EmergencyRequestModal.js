import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EmergencyRequestModal({ visible, type, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(reason);
    setReason("");
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="alert-circle-outline" size={26} color="#D97706" />
          </View>

          <Text style={styles.title}>Outside Office Location</Text>
          <Text style={styles.subtitle}>
            You're outside the office geofence. Send a{" "}
            {type === "punch-in" ? "punch-in" : "punch-out"} request to your admin for approval
            instead.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Reason (e.g. client visit, WFH)"
            placeholderTextColor="#9CA3AF"
            value={reason}
            onChangeText={setReason}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!reason.trim() || loading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!reason.trim() || loading}
          >
            <Text style={styles.submitText}>{loading ? "Sending..." : "Send Request"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 16,
  },

  submitBtn: {
    width: "100%",
    backgroundColor: "#112250",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  submitBtnDisabled: {
    opacity: 0.5,
  },

  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  cancelText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
});
