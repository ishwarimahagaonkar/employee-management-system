import React from "react";
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TripTimeline, {
  StepBox,
  Connector,
  DetailRow,
  StatusPill,
  fmtTime,
  fmtDateLabel,
} from "../../../../components/TripTimeline";

export default function EmployeeDayDetailModal({ visible, onClose, employee, date, attendance, trips }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{employee?.fullName || "Employee"}</Text>
            <Text style={styles.headerSub}>{fmtDateLabel(date)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ATTENDANCE */}
          <Text style={styles.sectionTitle}>Attendance</Text>
          {!attendance ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No attendance recorded for this day.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardHeading}>Work Day</Text>
                <StatusPill status={attendance.status} />
              </View>

              <StepBox
                icon="log-in-outline"
                iconColor="#16A34A"
                iconBg="#DCFCE7"
                title="Punch In"
                time={fmtTime(attendance.punchInTime)}
              >
                <DetailRow label="Location" value={attendance.punchInLocation?.address} />
              </StepBox>

              <Connector />

              <StepBox
                icon="log-out-outline"
                iconColor="#DC2626"
                iconBg="#FEE2E2"
                title="Punch Out"
                time={attendance.punchOutTime ? fmtTime(attendance.punchOutTime) : "In progress"}
              >
                <DetailRow label="Location" value={attendance.punchOutLocation?.address} />
              </StepBox>

              <View style={styles.summaryRow}>
                <DetailRow label="Working Hours" value={`${(attendance.workingHours || 0).toFixed(2)} h`} />
                {attendance.isHalfDay ? <DetailRow label="Half Day" value="Yes" /> : null}
              </View>
            </View>
          )}

          {/* TRAVEL */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Travel</Text>
          {trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No trips recorded for this day.</Text>
            </View>
          ) : (
            trips.map((trip, idx) => (
              <TripTimeline key={trip._id || idx} trip={trip} index={idx} />
            ))
          )}

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

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },

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

  summaryRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F5",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
