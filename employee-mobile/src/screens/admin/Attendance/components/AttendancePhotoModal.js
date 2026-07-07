import React from "react";
import { View, Text, Image, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

function PhotoBlock({ label, time, photo }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockLabel}>{label}</Text>
        <Text style={styles.blockTime}>{formatTime(time)}</Text>
      </View>

      {photo ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={28} color="#C4C4CC" />
          <Text style={styles.placeholderText}>No photo captured</Text>
        </View>
      )}
    </View>
  );
}

export default function AttendancePhotoModal({ visible, employee, record, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{employee?.fullName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <PhotoBlock label="Punch In" time={record?.punchInTime} photo={record?.punchInPhoto} />
            <PhotoBlock label="Punch Out" time={record?.punchOutTime} photo={record?.punchOutPhoto} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    marginBottom: 18,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  block: {
    marginBottom: 20,
  },

  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  blockLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  blockTime: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  photo: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: "#F1F1F5",
  },

  placeholder: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
