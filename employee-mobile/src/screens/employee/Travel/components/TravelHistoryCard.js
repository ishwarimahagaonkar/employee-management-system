import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
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
          <Ionicons name="location" size={18} color="#112250" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{trip.purpose}</Text>
          <Text style={styles.subtitle}>{formatDate(trip.startTime || trip.date)}</Text>
        </View>

        <View style={[styles.statusPill, inProgress ? styles.statusActive : styles.statusDone]}>
          <Text style={[styles.statusText, inProgress ? styles.statusActiveText : styles.statusDoneText]}>
            {inProgress ? "In Progress" : "Completed"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Start Time</Text>
          <Text style={styles.statValue}>{formatTime(trip.startTime)}</Text>
        </View>

        {!inProgress && (
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>End Time</Text>
            <Text style={styles.statValue}>{formatTime(trip.endTime)}</Text>
          </View>
        )}

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{inProgress ? "-" : `${trip.distanceKm} km`}</Text>
        </View>
      </View>

      {!!trip.startLocation?.address && (
        <View style={styles.addressRow}>
          <Text style={styles.addressLabel}>From</Text>
          <Text style={styles.addressValue}>{trip.startLocation.address}</Text>
        </View>
      )}

      {!!trip.endLocation?.address && (
        <View style={styles.addressRow}>
          <Text style={styles.addressLabel}>To</Text>
          <Text style={styles.addressValue}>{trip.endLocation.address}</Text>
        </View>
      )}

      {!!trip.meetingDetails?.customerName && (
        <View style={styles.meetingBox}>
          <Text style={styles.meetingCustomer}>{trip.meetingDetails.customerName}</Text>
          <Text style={styles.meetingTime}>
            {trip.meetingDetails.meetingStartTime} - {trip.meetingDetails.meetingEndTime}
          </Text>
          {!!trip.meetingDetails.notes && (
            <Text style={styles.meetingNotes}>{trip.meetingDetails.notes}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titleBlock: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  subtitle: {
    fontSize: 12,
    color: "#112250",
    marginTop: 1,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusActive: {
    backgroundColor: "#DBEAFE",
  },

  statusDone: {
    backgroundColor: "#DCFCE7",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  statusActiveText: {
    color: "#2563EB",
  },

  statusDoneText: {
    color: "#16A34A",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  statCol: {
    flex: 1,
  },

  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 2,
  },

  addressRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  addressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    width: 42,
  },

  addressValue: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  meetingBox: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },

  meetingCustomer: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  meetingTime: {
    fontSize: 12,
    color: "#112250",
    marginTop: 2,
  },

  meetingNotes: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
  },
});
