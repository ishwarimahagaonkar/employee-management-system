import React from "react";
import { View, Text, StyleSheet } from "react-native";

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function StatGrid({ items }) {
  return (
    <View style={styles.statGrid}>
      {items.map((it) => (
        <View key={it.label} style={styles.statItem}>
          <Text style={styles.statValue}>{it.value}</Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const STATUS_COLORS = {
  Approved: { bg: "#DCFCE7", text: "#16A34A" },
  Rejected: { bg: "#FEE2E2", text: "#DC2626" },
  Pending: { bg: "#FEF3C7", text: "#D97706" },
};

function Badge({ text }) {
  const c = STATUS_COLORS[text] || STATUS_COLORS.Pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{text}</Text>
    </View>
  );
}

export default function ReportPreview({ report }) {
  const {
    employee,
    reportingPeriod,
    generatedAt,
    generatedBy,
    attendanceSummary: a,
    leaveSummary,
    travelSummary,
    payrollImpact: p,
  } = report;

  return (
    <View>
      <SectionCard title="1. Employee Information">
        <Row label="Employee ID" value={employee.employeeId} />
        <Row label="Full Name" value={employee.fullName} />
        <Row label="Department" value={employee.department} />
        <Row label="Designation" value={employee.designation} />
        <Row label="Reporting Period" value={`${reportingPeriod.startDate} to ${reportingPeriod.endDate}`} />
      </SectionCard>

      <SectionCard title="2. Attendance Summary">
        <StatGrid
          items={[
            { label: "Working Days", value: a.totalWorkingDays },
            { label: "Present", value: a.presentDays },
            { label: "Absent", value: a.absentDays },
            { label: "Late", value: a.lateArrivals },
            { label: "Half Days", value: a.halfDays },
            { label: "Attendance %", value: `${a.attendancePercentage}%` },
          ]}
        />
        <Row label="Overtime Hours" value={a.overtimeHours} />
      </SectionCard>

      <SectionCard title="3. Leave Summary">
        {leaveSummary.records.length === 0 ? (
          <Text style={styles.emptyText}>No leave records in this period.</Text>
        ) : (
          leaveSummary.records.map((l, idx) => (
            <View key={idx} style={styles.leaveRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveType}>{l.leaveType} Leave</Text>
                <Text style={styles.leaveDates}>
                  {l.startDate} to {l.endDate} • {l.totalDays} day(s)
                </Text>
              </View>
              <Badge text={l.status} />
            </View>
          ))
        )}
        <View style={styles.divider} />
        <Row label="Total Approved Leave Days" value={leaveSummary.totalApprovedLeaveDays} />
        <Row label="Total Paid Leave Days" value={leaveSummary.totalPaidLeaveDays} />
        <Row label="Total Unpaid Leave Days" value={leaveSummary.totalUnpaidLeaveDays} />
        <Row label="Total Pending/Rejected Days" value={leaveSummary.totalPendingOrRejectedDays} />
      </SectionCard>

      <SectionCard title="4. Travel Summary">
        {travelSummary.records.length === 0 ? (
          <Text style={styles.emptyText}>No travel records in this period.</Text>
        ) : (
          travelSummary.records.map((t, idx) => (
            <View key={idx} style={styles.travelRow}>
              <Text style={styles.travelDate}>{t.date}</Text>
              <Text style={styles.travelDestination}>{t.destination}</Text>
              <Text style={styles.travelMeta}>Purpose: {t.purpose}</Text>
              <Text style={styles.travelMeta}>
                Approval: {t.approvalStatus} • Expense: {t.expenseAmount}
              </Text>
            </View>
          ))
        )}
        <View style={styles.divider} />
        <Row label="Total Approved Travel Claims" value={travelSummary.totalApprovedTravelClaims} />
      </SectionCard>

      <SectionCard title="5. Payroll Impact Summary">
        <Row label="Total Payable Days" value={p.totalPayableDays} />
        <Row label="Total Unpaid Leave/Absence Days" value={p.totalUnpaidLeaveAbsenceDays} />
        <Row label="Approved Travel Reimbursement" value={p.approvedTravelReimbursement} />
        <Text style={styles.notesLabel}>Notes for HR/Payroll</Text>
        <Text style={styles.notesText}>{p.notes}</Text>
      </SectionCard>

      <Text style={styles.footerText}>
        Generated on {new Date(generatedAt).toLocaleString()} by {generatedBy}
      </Text>
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

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  rowLabel: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },

  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
    flex: 1,
    textAlign: "right",
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },

  statItem: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 14,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#112250",
  },

  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },

  leaveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  leaveType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  leaveDates: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  travelRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  travelDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#112250",
  },

  travelDestination: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 2,
  },

  travelMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F1F5",
    marginVertical: 10,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E1B4B",
    marginTop: 10,
  },

  notesText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },

  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 30,
  },
});
