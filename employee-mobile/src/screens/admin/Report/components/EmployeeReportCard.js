import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function Metric({ icon, iconColor, iconBg, value, label }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function EmployeeReportCard({ employee, extraHours, unpaidLeaveDays, distanceKm }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{employee.fullName}</Text>
          <Text style={styles.meta}>
            {[employee.department, employee.designation].filter(Boolean).join(" • ")}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Metric
          icon="time-outline"
          iconColor="#D97706"
          iconBg="#FEF3C7"
          value={`${extraHours.toFixed(1)}h`}
          label="Extra Hours"
        />
        <Metric
          icon="calendar-outline"
          iconColor="#DC2626"
          iconBg="#FEE2E2"
          value={unpaidLeaveDays}
          label="Unpaid Leave"
        />
        <Metric
          icon="location-outline"
          iconColor="#112250"
          iconBg="#EDE9FE"
          value={`${distanceKm.toFixed(1)} km`}
          label="Traveled"
        />
      </View>
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
    marginBottom: 16,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 13,
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  metricsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F1F5",
    paddingTop: 14,
  },

  metric: {
    flex: 1,
    alignItems: "center",
  },

  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  metricLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },
});
