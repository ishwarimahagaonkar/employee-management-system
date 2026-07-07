import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const STATUS_STYLE = {
  "in-progress": { bg: "#DBEAFE", text: "#2563EB", label: "In Progress" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Completed" },
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function TravelDetailScreen({ route, navigation }) {
  const { trip } = route.params || {};
  const status = STATUS_STYLE[trip?.status] || STATUS_STYLE.completed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(trip?.employee?.fullName)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{trip?.employee?.fullName || "Unknown"}</Text>
            <Text style={styles.meta}>
              {[trip?.employee?.department, trip?.employee?.designation].filter(Boolean).join(" • ")}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Info</Text>
          <DetailRow label="Purpose" value={trip?.purpose} />
          <DetailRow label="Date" value={formatDate(trip?.date)} />
          <DetailRow label="Start Time" value={formatTime(trip?.startTime)} />
          <DetailRow
            label="End Time"
            value={trip?.status === "in-progress" ? "-" : formatTime(trip?.endTime)}
          />
          <DetailRow
            label="Distance"
            value={trip?.status === "in-progress" ? "-" : `${trip?.distanceKm || 0} km`}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>
          <DetailRow label="From" value={trip?.startLocation?.address || "-"} />
          <DetailRow label="To" value={trip?.endLocation?.address || "-"} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  scrollContent: {
    paddingBottom: 40,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: 15,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  detailLabel: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
});
