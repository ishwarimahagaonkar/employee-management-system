import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
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

import DailyReportForm from "./components/DailyReportForm";
import SiteChipSelector from "./components/SiteChipSelector";

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

// One report per site per day. This screen always shows exactly one: either
// the report already filed for the chosen site and date, or a blank form.
export default function DailyWorkReportScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const canSubmit = user?.role === "admin" || user?.role === "supervisor";

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [editable, setEditable] = useState(true);
  const [counts, setCounts] = useState({ present: 0, absent: 0, marked: false });
  const [loadingSites, setLoadingSites] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchSites = async () => {
    try {
      setError(null);
      const res = await api.get("/sites");
      const list = res.data.sites || [];
      setSites(list);
      if (list.length > 0) setSelectedSiteId((prev) => prev || list[0]._id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingSites(false);
    }
  };

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

      // A report filed on an earlier day is settled for supervisors; admins
      // can always correct it.
      if (found) {
        const filedOn = dateStr(new Date(found.createdAt));
        setEditable(user?.role === "admin" || filedOn === todayStr());
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
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) fetchDay(selectedSiteId, date);
  }, [selectedSiteId, date]);

  // Returns an error message for the form to show inline, or null once saved.
  const handleSubmit = async (form) => {
    setSubmitting(true);

    try {
      if (report) {
        await api.put(`/daily-reports/${report._id}`, form);
        setNotice("Report updated");
      } else {
        await api.post("/daily-reports", { siteId: selectedSiteId, date, ...form });
        setNotice("Daily report submitted");
      }

      await fetchDay(selectedSiteId, date);
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = date === todayStr();
  const noSites = !loadingSites && sites.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Work Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loadingSites ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : noSites ? (
        <Text style={styles.emptyText}>
          {user?.role === "supervisor"
            ? "No sites assigned to you yet."
            : "No sites yet. A supervisor creates these first."}
        </Text>
      ) : (
        <>
          <SiteChipSelector
            sites={sites}
            selectedId={selectedSiteId}
            onSelect={setSelectedSiteId}
          />

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
            <ErrorState message={error} onRetry={() => fetchDay(selectedSiteId, date)} />
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
