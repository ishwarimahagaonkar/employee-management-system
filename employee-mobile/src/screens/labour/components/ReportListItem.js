import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const dayLabel = (yyyyMmDd) =>
  new Date(`${yyyyMmDd}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

/**
 * One filed report in the month list.
 *
 * The counts shown are the ones stored on the report -- a snapshot taken when
 * it was saved, not a live read of the attendance sheet. That is deliberate:
 * the report is a record of what was stated on the day, and a number that
 * silently changed afterwards would make two people reading the same report
 * see different things.
 */
function ReportListItem({ report, onPress }) {
  const present = report.labourPresent || 0;
  const absent = report.labourAbsent || 0;
  const total = present + absent;

  const site = report.siteId;
  const supervisor = report.supervisorId;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(report)} activeOpacity={0.7}>
      <View style={styles.dateBlock}>
        <Text style={styles.dateText}>{dayLabel(report.date)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.site} numberOfLines={1}>
          {site?.name || "Unknown site"}
          {site?.code ? ` · ${site.code}` : ""}
        </Text>

        <Text style={styles.work} numberOfLines={2}>
          {report.workCompleted || "No work description"}
        </Text>

        <View style={styles.countRow}>
          <View style={[styles.pill, styles.presentPill]}>
            <Text style={styles.presentText}>{present} present</Text>
          </View>

          {absent > 0 && (
            <View style={[styles.pill, styles.absentPill]}>
              <Text style={styles.absentText}>{absent} absent</Text>
            </View>
          )}

          <Text style={styles.total}>of {total}</Text>
        </View>

        {!!supervisor?.fullName && (
          <Text style={styles.supervisor} numberOfLines={1}>
            filed by {supervisor.fullName}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#C4C9D2" />
    </TouchableOpacity>
  );
}

// The month list can run to a few hundred rows across sites; nothing here
// changes unless the report itself does.
export default React.memo(
  ReportListItem,
  (prev, next) => prev.report._id === next.report._id && prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEF1F5",
  },

  dateBlock: {
    width: 52,
    alignItems: "center",
  },

  dateText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#112250",
  },

  body: {
    flex: 1,
    minWidth: 0,
  },

  site: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  work: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  presentPill: {
    backgroundColor: "#DCFCE7",
  },

  presentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },

  absentPill: {
    backgroundColor: "#FEE2E2",
  },

  absentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },

  total: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  supervisor: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
