import React from "react";
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TripTimeline, { fmtDateLabel } from "../../../../components/TripTimeline";

export default function TripDetailModal({ visible, onClose, trip }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>Trip Details</Text>
            {!!trip && (
              <Text style={styles.headerSub}>{fmtDateLabel(trip.date || trip.startTime)}</Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {trip && <TripTimeline trip={trip} />}
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  headerSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  scroll: {
    padding: 16,
  },
});
