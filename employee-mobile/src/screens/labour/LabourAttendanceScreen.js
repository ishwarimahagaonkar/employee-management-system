import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../api/api.js";
import ErrorState from "../../components/ErrorState";
import { getApiErrorMessage } from "../../utils/apiError";
import { AuthContext } from "../../context/AuthContext";

import AttendanceRow from "./components/AttendanceRow";
import SiteChipSelector from "./components/SiteChipSelector";

// Dates are Asia/Kolkata calendar days, matching the server.
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

// Hours are shown live as the supervisor types, so the number matches what the
// server will store. Same rule: an unusable pair reads as zero rather than
// showing a negative.
const computeHours = (punchIn, punchOut) => {
  const valid = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || "");
  if (!valid(punchIn) || !valid(punchOut)) return 0;

  const mins = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const diff = mins(punchOut) - mins(punchIn);
  return diff > 0 ? Number((diff / 60).toFixed(2)) : 0;
};

export default function LabourAttendanceScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const canMark = user?.role === "admin" || user?.role === "supervisor";

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dirty, setDirty] = useState(false);

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

  const fetchSheet = async (siteId, forDate) => {
    if (!siteId) return;

    setLoadingSheet(true);
    setNotice(null);

    try {
      setError(null);
      const res = await api.get("/labour-attendance", { params: { siteId, date: forDate } });
      setRows(res.data.sheet || []);
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setRows([]);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) fetchSheet(selectedSiteId, date);
  }, [selectedSiteId, date]);

  const updateRow = (labourId, patch) => {
    setDirty(true);
    setNotice(null);

    setRows((prev) =>
      prev.map((row) => {
        if (String(row.labour._id) !== String(labourId)) return row;

        const next = { ...row, ...patch };
        next.workingHours = next.present ? computeHours(next.punchIn, next.punchOut) : 0;
        return next;
      })
    );
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await api.post("/labour-attendance", {
        siteId: selectedSiteId,
        date,
        // Locked rows are left out entirely -- the server would ignore them
        // anyway, and sending them just invites a confusing "skipped" reply.
        entries: rows
          .filter((row) => row.editable)
          .map((row) => ({
            labourId: row.labour._id,
            present: row.present,
            punchIn: row.present && row.punchIn ? row.punchIn : null,
            punchOut: row.present && row.punchOut ? row.punchOut : null,
          })),
      });

      setNotice(res.data.message);
      await fetchSheet(selectedSiteId, date);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayStr();
  const presentCount = rows.filter((r) => r.present).length;
  const editableCount = rows.filter((r) => r.editable).length;
  const noSites = !loadingSites && sites.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour Attendance</Text>
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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SiteChipSelector
            sites={sites}
            selectedId={selectedSiteId}
            onSelect={setSelectedSiteId}
          />

          <View style={styles.dateBar}>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => setDate(shiftDate(date, -1))}
            >
              <Ionicons name="chevron-back" size={20} color="#112250" />
            </TouchableOpacity>

            <Text style={styles.dateText}>{prettyDate(date)}</Text>

            {/* Attendance can't be recorded ahead of time, so today is the end
                of the road going forward. */}
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

          {loadingSheet ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchSheet(selectedSiteId, date)} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {presentCount} present of {rows.length}
                </Text>
              </View>

              <FlatList
                data={rows}
                keyExtractor={(item) => item.labour._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No active labour at this site. Add labour before marking attendance.
                  </Text>
                }
                renderItem={({ item }) => <AttendanceRow row={item} onChange={updateRow} />}
              />

              {canMark && rows.length > 0 && editableCount > 0 && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.saveBtn, (saving || !dirty) && styles.saveBtnDisabled]}
                    onPress={save}
                    disabled={saving || !dirty}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <View style={styles.savingRow}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.saveText}>Saving...</Text>
                      </View>
                    ) : (
                      <Text style={styles.saveText}>
                        {dirty ? "Save Attendance" : "Saved"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  flex: {
    flex: 1,
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
    lineHeight: 18,
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

  loader: {
    marginTop: 40,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F4F6F8",
  },

  saveBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  saveBtnDisabled: {
    opacity: 0.5,
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
