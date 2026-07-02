import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from "react-native";

export default function StartTripModal({
  visible,
  purpose,
  setPurpose,
  onStart,
  onClose,
  loading,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Enter Purpose</Text>

          <TextInput
            placeholder="Enter purpose of Trip"
            value={purpose}
            onChangeText={setPurpose}
            placeholderTextColor="#ddd"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.modalBtn}
            onPress={onStart}
            disabled={loading}
          >
            <Text style={styles.modalBtnText}>
              {loading ? "Starting..." : "START TRIP"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "#fff", textAlign: "center", marginTop: 10 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#6C63FF",
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  modalBtn: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#6C63FF",
    fontWeight: "700",
  },
});