//Attendance history card component

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AttendanceCard({ date, punchIn, punchOut, status }) {
  return (
    <View style={styles.card}>
      {/* Left side with calendar icon */}
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={22} color="#797878" />
        </View>
        <View>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.subText}>Punch In: {punchIn}</Text>
          {punchOut && <Text style={styles.subText}>Punch Out: {punchOut}</Text>}
        </View>
      </View>

      {/* Status badge */}
      <View
        style={[
          styles.badge,
          { backgroundColor: status === "late" ? "#FFECEC" : "#ECEAFF" },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: status === "late" ? "#FF5B5B" : "#112250" },
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1EEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  subText: {
    color: "#777",
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontWeight: "600",
  },
});
