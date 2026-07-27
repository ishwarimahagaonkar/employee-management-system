import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const fmtTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
};

export const fmtDateLabel = (dateStr) => {
  if (!dateStr) return "";
  // Accepts "YYYY-MM-DD" (UTC-anchored) or an ISO timestamp.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00Z`)
    : new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? "UTC" : "Asia/Kolkata",
  });
};

const STATUS_STYLE = {
  present: { bg: "#DCFCE7", text: "#16A34A", label: "Present" },
  late: { bg: "#FEF3C7", text: "#D97706", label: "Late" },
  approved: { bg: "#DCFCE7", text: "#16A34A", label: "Approved" },
  pending: { bg: "#DBEAFE", text: "#2563EB", label: "Pending" },
  rejected: { bg: "#FEE2E2", text: "#DC2626", label: "Rejected" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Completed" },
  "in-progress": { bg: "#DBEAFE", text: "#2563EB", label: "In Progress" },
};

export function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || { bg: "#F1F1F5", text: "#6B7280", label: status || "—" };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

// A single labelled step box (Start / End / Meeting / Punch) with an icon.
export function StepBox({ icon, iconColor, iconBg, title, time, children }) {
  return (
    <View style={styles.stepBox}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={15} color={iconColor} />
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {!!time && <Text style={styles.stepTime}>{time}</Text>}
      </View>
      {children}
    </View>
  );
}

export function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function Connector() {
  return (
    <View style={styles.connector}>
      <Ionicons name="arrow-down" size={16} color="#C4C4CC" />
    </View>
  );
}

// Renders one trip as a card: Start Trip -> End Trip -> Meeting boxes.
// Works for both employee trips (no `status` field) and admin feeds (has one).
export default function TripTimeline({ trip, showDate = false, index }) {
  const status = trip.status || (trip.endTime ? "completed" : "in-progress");
  const isCoTraveler = !!trip.isCoTraveler || !!trip.traveledWith;
  const coTravelerNames = (trip.coTravelers || [])
    .map((c) => (typeof c === "string" ? c : c?.fullName))
    .filter(Boolean);

  return (
    <View style={styles.card}>
      {showDate && !!(trip.date || trip.startTime) && (
        <Text style={styles.dateLabel}>{fmtDateLabel(trip.date || trip.startTime)}</Text>
      )}

      <View style={styles.cardTopRow}>
        <Text style={styles.cardHeading} numberOfLines={1}>
          {trip.purpose || (index != null ? `Trip ${index + 1}` : "Trip")}
        </Text>
        <StatusPill status={status} />
      </View>

      {/* Co-traveler's own view of a trip they were added to. */}
      {isCoTraveler && (
        <View style={styles.linkBanner}>
          <Ionicons name="people" size={14} color="#112250" />
          <Text style={styles.linkBannerText}>
            Traveled with {trip.traveledWith || "a colleague"} · no km recorded
          </Text>
        </View>
      )}

      {/* Primary's view: who traveled along. */}
      {!isCoTraveler && coTravelerNames.length > 0 && (
        <View style={styles.linkBanner}>
          <Ionicons name="people-outline" size={14} color="#112250" />
          <Text style={styles.linkBannerText}>
            With {coTravelerNames.join(", ")}
          </Text>
        </View>
      )}

      <StepBox
        icon="play-outline"
        iconColor="#16A34A"
        iconBg="#DCFCE7"
        title="Start Trip"
        time={fmtTime(trip.startTime)}
      >
        <DetailRow label="From" value={trip.startLocation?.address} />
      </StepBox>

      <Connector />

      <StepBox
        icon="flag-outline"
        iconColor="#DC2626"
        iconBg="#FEE2E2"
        title="End Trip"
        time={trip.endTime ? fmtTime(trip.endTime) : "In progress"}
      >
        <DetailRow label="To" value={trip.endLocation?.address} />
        {/* Shown to co-travelers too — the km just isn't added to their own totals. */}
        <DetailRow
          label="Distance"
          value={trip.distanceKm != null ? `${trip.distanceKm} km` : null}
        />
        <DetailRow label="Duration" value={trip.durationMin != null ? `${trip.durationMin} min` : null} />
      </StepBox>

      {!!trip.meetingDetails?.customerName && (
        <>
          <Connector />
          <StepBox
            icon="people-outline"
            iconColor="#112250"
            iconBg="#EDE9FE"
            title="Meeting"
            time={
              trip.meetingDetails.meetingStartTime
                ? `${trip.meetingDetails.meetingStartTime} - ${trip.meetingDetails.meetingEndTime}`
                : ""
            }
          >
            <DetailRow label="Customer" value={trip.meetingDetails.customerName} />
            <DetailRow label="Notes" value={trip.meetingDetails.notes} />
          </StepBox>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#112250",
    marginBottom: 8,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  cardHeading: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginRight: 8,
  },

  linkBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEECFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    gap: 6,
  },

  linkBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#112250",
  },

  stepBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1F5",
    padding: 12,
  },

  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  stepTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  stepTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#112250",
  },

  detailRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  detailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    width: 78,
  },

  detailValue: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  connector: {
    alignItems: "center",
    paddingVertical: 4,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
