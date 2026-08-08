import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
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
import SiteHeader from "../../components/SiteHeader";
import { getApiErrorMessage } from "../../utils/apiError";
import { AuthContext } from "../../context/AuthContext";
import { useActiveSite } from "../../context/SiteContext";

import AttendanceRow, { ROW_HEIGHT } from "./components/AttendanceRow";
import RosterPickerModal from "./components/RosterPickerModal";

// Row height plus its marginBottom, so the list can compute offsets without
// measuring every row.
const ROW_STRIDE = ROW_HEIGHT + 6;

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
  // Mirrors labour:attendance in backend/src/config/roles.js -- supervisor
  // only. Admin was removed deliberately, so there is no longer anyone who can
  // correct a past day once the supervisor's edit window has closed.
  const canMark = user?.role === "supervisor";

  // Which site is being worked on is session state, not screen state -- see
  // SiteContext. Switching sites here carries to the Labour and Daily Report
  // screens too, and survives navigating away.
  const {
    activeSite,
    activeSiteId,
    loading: loadingSites,
    error: sitesError,
  } = useActiveSite();

  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

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
    if (activeSiteId) fetchSheet(activeSiteId, date);
    else setRows([]);
  }, [activeSiteId, date]);

  // Puts people on this site for this date. They arrive unmarked -- present or
  // absent is a separate decision, made on the sheet below.
  const addToRoster = async (labourIds) => {
    try {
      const res = await api.post("/labour-attendance/roster", {
        siteId: activeSiteId,
        date,
        labourIds,
      });

      setPickerOpen(false);
      setNotice(res.data.message);
      await fetchSheet(activeSiteId, date);
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  // useCallback with a functional update, so this function keeps the same
  // identity across renders. AttendanceRow is memoised on it -- a new function
  // each render would defeat the memo and re-render every visible row.
  const removeFromRoster = useCallback(async (labourId) => {
    try {
      await api.delete("/labour-attendance/roster", {
        data: { siteId: activeSiteId, date, labourId },
      });

      await fetchSheet(activeSiteId, date);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [activeSiteId, date]);

  // Stable identity (no deps): every row is memoised on this, so recreating it
  // per render would re-render the whole visible list on each keystroke.
  const updateRow = useCallback((labourId, patch) => {
    setDirty(true);
    setNotice(null);

    setRows((prev) =>
      prev.map((row) => {
        if (String(row.labour._id) !== String(labourId)) return row;

        const next = { ...row, ...patch };

        // Presence mirrors the server's rule exactly: both punches recorded.
        // Deriving it here rather than storing a separate flag is what keeps
        // the on-screen count from drifting away from what gets saved.
        next.present = !!next.punchIn && !!next.punchOut;
        next.workingHours = computeHours(next.punchIn, next.punchOut);
        return next;
      })
    );
  }, []);

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await api.post("/labour-attendance", {
        siteId: activeSiteId,
        date,
        // Locked rows are left out entirely -- the server would ignore them
        // anyway, and sending them just invites a confusing "skipped" reply.
        entries: rows
          .filter((row) => row.editable)
          // `present` is deliberately not sent: the server derives it from the
          // punches, so a client that disagreed could not corrupt the counts.
          .map((row) => ({
            labourId: row.labour._id,
            punchIn: row.punchIn || null,
            punchOut: row.punchOut || null,
          })),
      });

      setNotice(res.data.message);
      await fetchSheet(activeSiteId, date);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayStr();
  // Counted on the in-time, matching labourCountsFor on the server: turning up
  // is what "present" means for the day's report. `completeCount` is the
  // narrower "full shift recorded" figure, shown so a supervisor can see who
  // still needs punching out before they leave.
  const presentCount = rows.filter((r) => !!r.punchIn).length;
  const completeCount = rows.filter((r) => !!r.punchIn && !!r.punchOut).length;
  const unmarkedCount = rows.filter((r) => !r.punchIn).length;
  const editableCount = rows.filter((r) => r.editable).length;
  const noSite = !loadingSites && !activeSiteId;

  // Searching filters the roster in place. Counts above stay whole-roster on
  // purpose: "12 present of 40" must not change just because you searched.
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) =>
      `${r.labour.fullName} ${r.labour.labourId}`.toLowerCase().includes(term)
    );
  }, [rows, search]);

  // Rows are a fixed height, so offsets can be computed instead of measured --
  // this is what keeps a long crew list scrolling smoothly.
  const getItemLayout = useCallback(
    (_, index) => ({ length: ROW_STRIDE, offset: ROW_STRIDE * index, index }),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour Attendance</Text>

        {/* Adding needs a site and the right to mark. */}
        {canMark && activeSiteId ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loadingSites ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : noSite ? (
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
          {/* Site and date share one bar. They used to be two stacked rows,
              which cost ~50px of a screen whose whole job is showing a list. */}
          <SiteHeader
            onSiteChange={(siteId) => fetchSheet(siteId, date)}
            right={
              <View style={styles.dateStepper}>
                <TouchableOpacity
                  style={styles.dateArrow}
                  onPress={() => setDate(shiftDate(date, -1))}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons name="chevron-back" size={17} color="#112250" />
                </TouchableOpacity>

                <Text style={styles.dateText}>{prettyDate(date)}</Text>

                {/* Attendance can't be recorded ahead of time, so today is the
                    end of the road going forward. */}
                <TouchableOpacity
                  style={styles.dateArrow}
                  onPress={() => setDate(shiftDate(date, 1))}
                  disabled={isToday}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons name="chevron-forward" size={17} color={isToday ? "#C4C9D2" : "#112250"} />
                </TouchableOpacity>
              </View>
            }
          />

          {!!notice && (
            <View style={styles.noticeBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          {loadingSheet ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchSheet(activeSiteId, date)} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {presentCount} present of {rows.length}
                  {presentCount > completeCount
                    ? ` · ${presentCount - completeCount} still on site`
                    : ""}
                  {unmarkedCount > 0 ? ` · ${unmarkedCount} absent` : ""}
                </Text>
                <Text style={styles.clockHint}>punch in, then out</Text>
              </View>

              {/* Search appears only when the roster is long enough to need
                  it -- on a crew of six it would just cost a row of height. */}
              {rows.length > 8 && (
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Find in this roster"
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                  />
                  {!!search && (
                    <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color="#C4C9D2" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <FlatList
                data={visibleRows}
                keyExtractor={(item) => item.labour._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                getItemLayout={getItemLayout}
                // Tuned for a long crew: render enough to fill the screen,
                // then extend in small batches rather than one large stall.
                initialNumToRender={14}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews={Platform.OS === "android"}
                ListEmptyComponent={
                  // An empty roster is normal at the start of a day, not an
                  // error -- say what to do about it.
                  <Text style={styles.emptyText}>
                    {search
                      ? "Nobody on this roster matches that."
                      : canMark
                        ? `Nobody is on ${activeSite?.name || "this site"} for ${prettyDate(date).toLowerCase()} yet.\n\nTap + to choose who is working today.`
                        : "Nobody has been added to this site for this day."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <AttendanceRow
                    row={item}
                    onChange={updateRow}
                    onRemove={canMark ? removeFromRoster : undefined}
                  />
                )}
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

      <RosterPickerModal
        visible={pickerOpen}
        siteName={activeSite?.name}
        alreadyOn={rows.map((r) => r.labour._id)}
        onClose={() => setPickerOpen(false)}
        onAdd={addToRoster}
      />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  headerSpacer: {
    width: 36,
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#112250",
    alignItems: "center",
    justifyContent: "center",
  },

  dateStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  dateArrow: {
    paddingHorizontal: 2,
  },

  dateText: {
    minWidth: 62,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },

  summaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  clockHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1E1B4B",
    padding: 0,
  },

  loader: {
    marginTop: 40,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F4F6F8",
  },

  saveBtn: {
    backgroundColor: "#112250",
    borderRadius: 14,
    paddingVertical: 13,
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
