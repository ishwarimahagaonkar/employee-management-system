import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import api from "../../api/api.js";
import { arrayBufferToBase64, arrayBufferToText } from "../../utils/base64.js";
import { getApiErrorMessage } from "../../utils/apiError";
import { AuthContext } from "../../context/AuthContext";

import DateField from "../../components/DateField";
import SimplePickerModal from "./components/SimplePickerModal";

const dateStr = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const todayStr = () => dateStr(new Date());

const firstOfMonth = () => {
  const [y, m] = todayStr().split("-");
  return `${y}-${m}-01`;
};

// Monday of the current week. Sunday counts as the end of the week, not the
// start, which is how site weeks are usually read.
const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const back = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - back);
  return dateStr(now);
};

const PERIODS = [
  { key: "today", label: "Today", range: () => ({ startDate: todayStr(), endDate: todayStr() }) },
  { key: "week", label: "This Week", range: () => ({ startDate: startOfWeek(), endDate: todayStr() }) },
  { key: "month", label: "This Month", range: () => ({ startDate: firstOfMonth(), endDate: todayStr() }) },
  { key: "custom", label: "Custom", range: null },
];

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  pdf: "application/pdf",
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function LabourReportScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const isSupervisor = user?.role === "supervisor";

  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [labourers, setLabourers] = useState([]);

  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayStr());

  const [siteId, setSiteId] = useState(null);
  const [supervisorId, setSupervisorId] = useState(null);
  const [labourId, setLabourId] = useState(null);

  const [picker, setPicker] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);

  // Filter sources. Supervisors get no supervisor filter -- the server confines
  // them to their own sites regardless, so the control would do nothing.
  useEffect(() => {
    const load = async () => {
      try {
        const requests = [api.get("/sites")];
        if (!isSupervisor) {
          requests.push(api.get("/employees", { params: { role: "supervisor" } }));
        }

        const [sitesRes, supsRes] = await Promise.all(requests);
        setSites(sitesRes.data.sites || []);
        if (supsRes) setSupervisors(supsRes.data.employees || []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
    };

    load();
  }, [isSupervisor]);

  // The labour list follows the chosen site, so the picker never offers
  // someone the report would then reject.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/labour", { params: siteId ? { siteId } : {} });
        setLabourers(res.data.labour || []);
      } catch (err) {
        setLabourers([]);
      }
    };

    load();
    setLabourId(null);
  }, [siteId]);

  const choosePeriod = (key) => {
    setPeriod(key);
    const found = PERIODS.find((p) => p.key === key);

    if (found?.range) {
      const { startDate: s, endDate: e } = found.range();
      setStartDate(s);
      setEndDate(e);
    }
  };

  const filterParams = () => {
    const params = { startDate, endDate };
    if (siteId) params.siteId = siteId;
    if (supervisorId) params.supervisorId = supervisorId;
    if (labourId) params.labourId = labourId;
    return params;
  };

  const localDateProblem = () => {
    if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
      return "Dates must look like 2026-08-01.";
    }
    if (startDate > endDate) return "Start date must be before end date.";
    return null;
  };

  const generate = async () => {
    const problem = localDateProblem();
    if (problem) {
      setError(problem);
      setReport(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/labour-reports", { params: filterParams() });
      setReport(res.data.report);
    } catch (err) {
      setReport(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const download = async (format) => {
    const problem = localDateProblem();
    if (problem) {
      setError(problem);
      return;
    }

    setDownloading(format);

    try {
      const res = await api.get("/labour-reports/export", {
        params: { ...filterParams(), format },
        responseType: "arraybuffer",
      });

      const base64 = arrayBufferToBase64(res.data);
      const fileName = `labour-report-${startDate}_to_${endDate}.${format}`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: MIME[format],
          dialogTitle: "Export Labour Report",
        });
      } else {
        Alert.alert("Report saved", `Saved to ${fileUri}`);
      }
    } catch (err) {
      // A failed export still answers with JSON, but responseType made it a
      // buffer -- without decoding it the user only ever sees "Request failed
      // with status code 400" instead of what actually went wrong.
      let message = err.message || "Could not export report";
      try {
        const decoded = JSON.parse(arrayBufferToText(err.response?.data));
        if (decoded.message) message = decoded.message;
      } catch (parseError) {
        // Not JSON (a network failure, say) -- keep the generic message.
      }

      Alert.alert("Export failed", message);
    } finally {
      setDownloading(null);
    }
  };

  const siteLabel = siteId
    ? sites.find((s) => String(s._id) === String(siteId))?.name || "Site"
    : "All sites";
  const supervisorLabel = supervisorId
    ? supervisors.find((s) => String(s._id) === String(supervisorId))?.fullName || "Supervisor"
    : "All supervisors";
  const labourLabel = labourId
    ? labourers.find((l) => String(l._id) === String(labourId))?.fullName || "Labour"
    : "All labour";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Period</Text>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                onPress={() => choosePeriod(p.key)}
              >
                <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Calendars rather than typed dates. The value stays the same
              "YYYY-MM-DD" string the API already expects -- DateField returns
              the calendar's own dateString and never converts through a Date,
              so the picked day cannot shift by one.
              maxDate on From is the chosen To (and vice versa via minDate), so
              an inverted range cannot be produced in the first place. */}
          {period === "custom" && (
            <View style={styles.dateRow}>
              <DateField
                label="From"
                value={startDate}
                onChange={setStartDate}
                maxDate={endDate || todayStr()}
                style={styles.dateCol}
              />
              <DateField
                label="To"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate || undefined}
                maxDate={todayStr()}
                style={styles.dateCol}
              />
            </View>
          )}

          {period !== "custom" && (
            <Text style={styles.rangeHint}>{startDate} to {endDate}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>

          <TouchableOpacity style={styles.filterRow} onPress={() => setPicker("site")}>
            <Text style={styles.filterLabel}>Site</Text>
            <View style={styles.filterValueRow}>
              <Text style={styles.filterValue} numberOfLines={1}>{siteLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {!isSupervisor && (
            <TouchableOpacity style={styles.filterRow} onPress={() => setPicker("supervisor")}>
              <Text style={styles.filterLabel}>Supervisor</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>{supervisorLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.filterRow} onPress={() => setPicker("labour")}>
            <Text style={styles.filterLabel}>Labour</Text>
            <View style={styles.filterValueRow}>
              <Text style={styles.filterValue} numberOfLines={1}>{labourLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.btnBusy]}
          onPress={generate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.generateText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.generateText}>Generate Report</Text>
          )}
        </TouchableOpacity>

        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!!report && (
          <>
            <View style={styles.totalsCard}>
              <View style={styles.totalBox}>
                <Text style={styles.totalValue}>{report.totals.present}</Text>
                <Text style={styles.totalLabel}>Present</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalBox}>
                <Text style={styles.totalValue}>{report.totals.absent}</Text>
                <Text style={styles.totalLabel}>Absent</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalBox}>
                <Text style={styles.totalValue}>{report.totals.workingHours}</Text>
                <Text style={styles.totalLabel}>Hours</Text>
              </View>
            </View>

            <View style={styles.exportRow}>
              {["pdf", "xlsx", "csv"].map((format) => (
                <TouchableOpacity
                  key={format}
                  style={[styles.exportBtn, downloading === format && styles.btnBusy]}
                  onPress={() => download(format)}
                  disabled={!!downloading}
                >
                  {downloading === format ? (
                    <ActivityIndicator size="small" color="#112250" />
                  ) : (
                    <Text style={styles.exportText}>{format.toUpperCase()}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Records ({report.totals.records})
              </Text>

              {report.rows.length === 0 ? (
                <Text style={styles.emptyText}>
                  No attendance was recorded for these filters.
                </Text>
              ) : (
                report.rows.map((row, index) => (
                  <View key={`${row.date}-${row.labourId}-${index}`} style={styles.recordRow}>
                    <View style={styles.recordMain}>
                      <Text style={styles.recordName} numberOfLines={1}>
                        {row.labourName}
                      </Text>
                      <Text style={styles.recordMeta}>
                        {row.date} • {row.site}
                      </Text>
                      <Text style={styles.recordMeta}>
                        {row.status === "Present"
                          ? `In ${row.punchIn} • Out ${row.punchOut}`
                          : "Absent"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.recordHours,
                        row.status !== "Present" && styles.recordAbsent,
                      ]}
                    >
                      {row.status === "Present" ? `${row.workingHours}h` : "--"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <SimplePickerModal
        visible={picker === "site"}
        title="Filter by Site"
        allLabel="All sites"
        items={sites.map((s) => ({ _id: s._id, title: s.name, subtitle: s.code }))}
        selectedId={siteId}
        onSelect={setSiteId}
        onClose={() => setPicker(null)}
      />

      <SimplePickerModal
        visible={picker === "supervisor"}
        title="Filter by Supervisor"
        allLabel="All supervisors"
        items={supervisors.map((s) => ({ _id: s._id, title: s.fullName, subtitle: s.empID }))}
        selectedId={supervisorId}
        onSelect={setSupervisorId}
        onClose={() => setPicker(null)}
      />

      <SimplePickerModal
        visible={picker === "labour"}
        title="Filter by Labour"
        allLabel="All labour"
        items={labourers.map((l) => ({ _id: l._id, title: l.fullName, subtitle: l.labourId }))}
        selectedId={labourId}
        onSelect={setLabourId}
        onClose={() => setPicker(null)}
      />
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

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 12,
  },

  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  periodBtn: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  periodBtnActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  periodText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  periodTextActive: {
    color: "#112250",
  },

  rangeHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 10,
  },

  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  dateCol: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E1B4B",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  filterValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },

  filterValue: {
    fontSize: 13,
    color: "#6B7280",
    flexShrink: 1,
  },

  generateBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  btnBusy: {
    opacity: 0.7,
  },

  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  generateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },

  totalsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  totalBox: {
    flex: 1,
    alignItems: "center",
  },

  totalDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#112250",
  },

  totalLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#112250",
    backgroundColor: "#fff",
    alignItems: "center",
  },

  exportText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#112250",
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  recordMain: {
    flex: 1,
  },

  recordName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  recordMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  recordHours: {
    fontSize: 14,
    fontWeight: "700",
    color: "#112250",
  },

  recordAbsent: {
    color: "#D97706",
  },

  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 16,
    lineHeight: 20,
  },
});
