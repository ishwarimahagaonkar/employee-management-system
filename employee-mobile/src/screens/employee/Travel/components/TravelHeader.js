import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatElapsed = (isoStart) => {
  if (!isoStart) return "-";
  const minutes = Math.max(Math.round((Date.now() - new Date(isoStart).getTime()) / 60000), 0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function TravelHeader({
  activeTrip,
  currentTrip,
  purpose,
  setPurpose,
  btnLoading,
  pendingMeetingTrip,
  onStart,
  onEnd,
  onAddMeeting,
}) {
  return (
    <LinearGradient
      colors={["#112250", "#112250"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <Text style={styles.title}>Travel</Text>

      <View style={styles.box}>
        {activeTrip ? (
          <>
            <View style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="navigate" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.rowTitle}>Trip in Progress</Text>
                <Text style={styles.rowSubtitle}>{currentTrip?.purpose}</Text>
              </View>
            </View>

            <View style={styles.mapPlaceholder}>
              <Ionicons name="location" size={32} color="rgba(255,255,255,0.7)" />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Start Time</Text>
                <Text style={styles.statValue}>{formatTime(currentTrip?.startTime)}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{formatElapsed(currentTrip?.startTime)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={onEnd} disabled={btnLoading}>
              <Text style={styles.actionText}>{btnLoading ? "Ending..." : "End Trip"}</Text>
            </TouchableOpacity>
          </>
        ) : pendingMeetingTrip ? (
          <>
            <View style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="people-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.rowTitle}>Meeting Details Pending</Text>
                <Text style={styles.rowSubtitle}>{pendingMeetingTrip?.purpose}</Text>
              </View>
            </View>

            <Text style={styles.pendingText}>
              Add details for your last meeting before starting a new trip.
            </Text>

            <TouchableOpacity style={styles.actionBtn} onPress={onAddMeeting} disabled={btnLoading}>
              <Text style={styles.actionText}>Add Meeting Details</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="location-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.rowTitle}>No Active Trip</Text>
                <Text style={styles.rowSubtitle}>Start tracking your travel</Text>
              </View>
            </View>

            <TextInput
              placeholder="Purpose of travel..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={purpose}
              onChangeText={setPurpose}
              style={styles.input}
            />

            <TouchableOpacity style={styles.actionBtn} onPress={onStart} disabled={btnLoading}>
              <Text style={styles.actionText}>{btnLoading ? "Starting..." : "Confirm & Start Trip"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
  },

  box: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 22,
    padding: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rowTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  rowSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },

  mapPlaceholder: {
    height: 110,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  statsRow: {
    flexDirection: "row",
    marginBottom: 18,
  },

  statCol: {
    flex: 1,
  },

  statLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },

  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 14,
    marginBottom: 18,
  },

  pendingText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
  },

  actionBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  actionText: {
    color: "#112250",
    fontSize: 16,
    fontWeight: "700",
  },
});
