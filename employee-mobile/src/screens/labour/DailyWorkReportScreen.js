import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../api/api.js";
import ErrorState from "../../components/ErrorState";
import { getApiErrorMessage } from "../../utils/apiError";
import { AuthContext } from "../../context/AuthContext";
import { useActiveSite } from "../../context/SiteContext";

import DailyReportForm from "./components/DailyReportForm";
import SiteHeader from "../../components/SiteHeader";
import MonthSelector, { monthRange, monthLabel } from "./components/MonthSelector";
import ReportListItem from "./components/ReportListItem";

const dateStr = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const todayStr = () => dateStr(new Date());

const shiftDate = (yyyyMmDd, days) => {
  const d = new Date(`${yyyyMmDd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateStr(d);
};

const prettyDate = (yyyyMmDd) => {
  if (yyyyMmDd === todayStr()) return "Today";
  return new Date(`${yyyyMmDd}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

// Asia/Kolkata "now", so the month view opens on the right month.
const nowParts = () => {
  const [y, m] = todayStr().split("-").map(Number);
  return { year: y, month: m - 1 };
};

// One report per site per day, and two ways of looking at them:
//
//   day   -- the supervisor's job: file or correct ONE report for the active
//            site on one date.
//   month -- the overseer's job: what happened across every site this month,
//            with the present/absent counts and what the supervisor wrote.
//
// Admin and manager land on the month view because they are reviewing; a
// supervisor lands on the day form because they are filing. Either can switch.
export default function DailyWorkReportScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  // Mirrors dailyReport:submit in backend/src/config/roles.js. Admin is
  // deliberately absent: it reads reports but never files or corrects one.
  const canSubmit = user?.role === "manager" || user?.role === "supervisor";
  const oversees = user?.role === "admin" || user?.role === "manager";

  // Active site is shared session state -- see SiteContext. Switching here
  // carries to Attendance and Labour too.
  const { activeSite, activeSiteId, changeSite, loading: loadingSites } = useActiveSite();

  const [mode, setMode] = useState(oversees ? "month" : "day");

  const [period, setPeriod] = useState(nowParts);
  const [reports, setReports] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [monthError, setMonthError] = useState(null);

  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [editable, setEditable] = useState(true);
  const [counts, setCounts] = useState({ present: 0, absent: 0, marked: false });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // The report and the attendance counts are fetched together: a blank form
  // still has to show how many labourers were present, since those numbers are
  // never typed in.
  const fetchDay = async (siteId, forDate) => {
    if (!siteId) return;

    setLoading(true);
    setNotice(null);

    try {
      setError(null);

      const [reportRes, sheetRes] = await Promise.all([
        api.get("/daily-reports", { params: { siteId, date: forDate } }),
        api.get("/labour-attendance", { params: { siteId, date: forDate } }),
      ]);

      const found = (reportRes.data.reports || [])[0] || null;
      setReport(found);

      // A report filed on an earlier day is settled for supervisors; the
      // manager above them can always correct it.
      if (found) {
        const filedOn = dateStr(new Date(found.createdAt));
        setEditable(user?.role === "manager" || filedOn === todayStr());
      } else {
        setEditable(canSubmit);
      }

      const totals = sheetRes.data.totals || {};
      setCounts({
        present: totals.present || 0,
        absent: totals.absent || 0,
        marked: (totals.marked || 0) > 0,
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "day" && activeSiteId) fetchDay(activeSiteId, date);
  }, [mode, activeSiteId, date]);

  // Every report filed in the chosen month, across ALL sites -- no siteId is
  // sent. The server already scopes this: a supervisor only ever gets their own
  // sites back, so the same call is safe for whoever is looking.
  const fetchMonth = useCallback(async (year, month) => {
    setLoadingMonth(true);
    setMonthError(null);

    try {
      const { startDate, endDate } = monthRange(year, month);
      const res = await api.get("/daily-reports", { params: { startDate, endDate } });
      setReports(res.data.reports || []);
    } catch (err) {
      setMonthError(getApiErrorMessage(err));
      setReports([]);
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "month") fetchMonth(period.year, period.month);
  }, [mode, period, fetchMonth]);

  // Opening a report from the list jumps the day view to that report's site
  // AND date. Both are required: the month list spans every site, so moving
  // only the date would open a DIFFERENT site's report for that day -- or a
  // blank form -- while appearing to have opened the one that was tapped.
  const openReport = useCallback(
    (report) => {
      const siteId = report.siteId?._id || report.siteId;

      if (siteId && String(siteId) !== String(activeSiteId)) {
        changeSite(siteId);
      }

      setDate(report.date);
      setMode("day");
    },
    [activeSiteId, changeSite]
  );

  // Returns an error message for the form to show inline, or null once saved.
  const handleSubmit = async (form) => {
    setSubmitting(true);

    try {
      if (report) {
        await api.put(`/daily-reports/${report._id}`, form);
        setNotice("Report updated");
      } else {
        await api.post("/daily-reports", { siteId: activeSiteId, date, ...form });
        setNotice("Daily report submitted");
      }

      await fetchDay(activeSiteId, date);
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = date === todayStr();
  const noSite = !loadingSites && !activeSiteId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Work Report</Text>

        {/* Everyone gets both views. A supervisor filing today still wants to
            look back over the month, and a manager correcting a report needs
            the day form. Only the landing view differs by role. */}
        <TouchableOpacity
          style={styles.modeBtn}
          onPress={() => setMode(mode === "month" ? "day" : "month")}
        >
          <Ionicons
            name={mode === "month" ? "create-outline" : "calendar-outline"}
            size={20}
            color="#112250"
          />
        </TouchableOpacity>
      </View>

      {mode === "month" ? (
        <>
          <MonthSelector
            year={period.year}
            month={period.month}
            onChange={(year, month) => setPeriod({ year, month })}
          />

          {loadingMonth ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : monthError ? (
            <ErrorState
              message={monthError}
              onRetry={() => fetchMonth(period.year, period.month)}
            />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {reports.length === 0
                    ? "No reports"
                    : `${reports.length} report${reports.length === 1 ? "" : "s"}` +
                      ` · ${reports.reduce((n, r) => n + (r.labourPresent || 0), 0)} labour present`}
                </Text>
              </View>

              <FlatList
                data={reports}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ReportListItem report={item} onPress={openReport} />
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    Nothing was filed in {monthLabel(period.year, period.month)}.
                  </Text>
                }
              />
            </>
          )}
        </>
      ) : loadingSites ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : noSite ? (
        <Text style={styles.emptyText}>
          {user?.role === "supervisor"
            ? "No sites assigned to you yet."
            : "No sites yet. A supervisor creates these first."}
        </Text>
      ) : (
        <>
          <SiteHeader onSiteChange={(siteId) => fetchDay(siteId, date)} />

          <View style={styles.dateBar}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => setDate(shiftDate(date, -1))}>
              <Ionicons name="chevron-back" size={20} color="#112250" />
            </TouchableOpacity>

            <Text style={styles.dateText}>{prettyDate(date)}</Text>

            <TouchableOpacity
              style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
              onPress={() => setDate(shiftDate(date, 1))}
              disabled={isToday}
            >
              <Ionicons name="chevron-forward" size={20} color={isToday ? "#D1D5DB" : "#112250"} />
            </TouchableOpacity>
          </View>

          {!!notice && (
            <View style={styles.noticeBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchDay(activeSiteId, date)} />
          ) : !report && !canSubmit ? (
            // Managers can read reports but never file them, so an empty form
            // would just be a wall of dead inputs.
            <Text style={styles.emptyText}>
              No report was filed for this site on {prettyDate(date).toLowerCase()}.
            </Text>
          ) : (
            <DailyReportForm
              report={report}
              editable={editable && canSubmit}
              labourPresent={counts.present}
              labourAbsent={counts.absent}
              attendanceMarked={counts.marked}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </>
      )}
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

  headerSpacer: {
    width: 24,
  },

  modeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  summaryRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  dateArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dateArrowDisabled: {
    opacity: 0.5,
  },

  dateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#15803D",
  },

  loader: {
    marginTop: 40,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
