import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STATUS_STYLE = {
  present: { bg: "#DCFCE7", text: "#16A34A", label: "Present" },
  late: { bg: "#FEF3C7", text: "#D97706", label: "Late" },
  absent: { bg: "#FEE2E2", text: "#DC2626", label: "Absent" },
  pending: { bg: "#FEF3C7", text: "#D97706", label: "Pending" },
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function EmployeeAttendanceRow({ employee, record }) {
  const status = !record
    ? "absent"
    : ["late", "pending"].includes(record.status)
    ? record.status
    : "present";
  const style = STATUS_STYLE[status];

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{employee.fullName}</Text>
        <Text style={styles.meta}>
          {[employee.department, employee.designation].filter(Boolean).join(" • ")}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.statusPill, { backgroundColor: style.bg }]}>
          <Text style={[styles.statusText, { color: style.text }]}>{style.label}</Text>
        </View>
        <Text style={styles.time}>{formatTime(record?.punchInTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
    color: "#6D5DF6",
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

  right: {
    alignItems: "flex-end",
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

  time: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
