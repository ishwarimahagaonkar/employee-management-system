import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
};

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function TravelHistoryCard({ trip }) {
  const inProgress = !trip.endTime;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="location" size={16} color="#112250" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{trip.purpose}</Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {formatDate(trip.startTime || trip.date)} • {formatTime(trip.startTime)}
            {!inProgress ? ` - ${formatTime(trip.endTime)}` : ""}
            {!inProgress ? ` • ${trip.distanceKm} km` : ""}
          </Text>
        </View>

        <View style={[styles.statusPill, inProgress ? styles.statusActive : styles.statusDone]}>
          <Text style={[styles.statusText, inProgress ? styles.statusActiveText : styles.statusDoneText]}>
            {inProgress ? "In Progress" : "Done"}
          </Text>
        </View>
      </View>

      {!!(trip.startLocation?.address || trip.endLocation?.address) && (
        <Text style={styles.addressLine} numberOfLines={1}>
          {trip.startLocation?.address || "-"} → {trip.endLocation?.address || "-"}
        </Text>
      )}

      {!!trip.meetingDetails?.customerName && (
        <Text style={styles.meetingLine} numberOfLines={1}>
          {trip.meetingDetails.customerName}
          {trip.meetingDetails.meetingStartTime ? ` • ${trip.meetingDetails.meetingStartTime}-${trip.meetingDetails.meetingEndTime}` : ""}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  titleBlock: {
    flex: 1,
    marginRight: 8,
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  metaLine: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  statusActive: {
    backgroundColor: "#DBEAFE",
  },

  statusDone: {
    backgroundColor: "#DCFCE7",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  statusActiveText: {
    color: "#2563EB",
  },

  statusDoneText: {
    color: "#16A34A",
  },

  addressLine: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
    marginLeft: 40,
  },

  meetingLine: {
    fontSize: 11,
    color: "#112250",
    marginTop: 4,
    marginLeft: 40,
  },
});
