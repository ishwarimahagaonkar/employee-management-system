import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import api from "../../../../api/api.js";
import { arrayBufferToBase64 } from "../../../../utils/base64.js";
import EmployeePickerModal from "./EmployeePickerModal";
import PeriodPickerModal from "./PeriodPickerModal";
import ReportPreview from "./ReportPreview";

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const firstOfMonthStr = () => {
  const [y, m] = todayStr().split("-");
  return `${y}-${m}-01`;
};

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  pdf: "application/pdf",
};

export default function DetailedReportPanel({ employees }) {
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState(firstOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [periodLabel, setPeriodLabel] = useState("This Month");

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!selectedEmployee) {
      Alert.alert("Select employee", "Please choose an employee first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/report/employee", {
        params: { userId: selectedEmployee._id, startDate, endDate },
      });
      setReport(res.data?.data || null);
    } catch (err) {
      setReport(null);
      setError(err.response?.data?.message || "Could not generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    if (!selectedEmployee) return;

    setDownloadingFormat(format);
    try {
      const res = await api.get("/report/employee/export", {
        params: { userId: selectedEmployee._id, startDate, endDate, format },
        responseType: "arraybuffer",
      });

      const base64 = arrayBufferToBase64(res.data);
      const fileName = `report-${selectedEmployee.empID}-${startDate}_to_${endDate}.${format}`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: MIME[format], dialogTitle: "Export Report" });
      } else {
        Alert.alert("Report saved", `Saved to ${fileUri}`);
      }
    } catch (err) {
      Alert.alert("Export failed", err.response?.data?.message || err.message || "Could not export report");
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Salary slip is per-month; derive month/year from the selected period's
  // start date (e.g. "This Month" -> the 1st of the current month).
  const handleDownloadSlip = async () => {
    if (!selectedEmployee) return;

    const [year, month] = startDate.split("-");
    setDownloadingSlip(true);
    try {
      const res = await api.get("/salary-slip/generate", {
        params: { userId: selectedEmployee._id, month, year },
        responseType: "arraybuffer",
      });

      const base64 = arrayBufferToBase64(res.data);
      const fileName = `salary-slip-${selectedEmployee.empID}-${month}-${year}.pdf`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: MIME.pdf, dialogTitle: "Salary Slip" });
      } else {
        Alert.alert("Salary slip saved", `Saved to ${fileUri}`);
      }
    } catch (err) {
      Alert.alert("Download failed", err.response?.data?.message || err.message || "Could not generate salary slip");
    } finally {
      setDownloadingSlip(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.selector} onPress={() => setEmployeeModalVisible(true)}>
        <View style={styles.selectorIcon}>
          <Ionicons name="person-outline" size={18} color="#112250" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectorLabel}>Employee</Text>
          <Text style={styles.selectorValue}>
            {selectedEmployee ? selectedEmployee.fullName : "Select employee"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.selector} onPress={() => setPeriodModalVisible(true)}>
        <View style={styles.selectorIcon}>
          <Ionicons name="calendar-outline" size={18} color="#112250" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectorLabel}>Reporting Period</Text>
          <Text style={styles.selectorValue}>{periodLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.generateBtn, !selectedEmployee && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={!selectedEmployee || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>Generate Report</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {report && (
        <>
          <View style={styles.downloadRow}>
            {["xlsx", "csv", "pdf"].map((format) => (
              <TouchableOpacity
                key={format}
                style={styles.downloadBtn}
                onPress={() => handleDownload(format)}
                disabled={downloadingFormat !== null}
              >
                {downloadingFormat === format ? (
                  <ActivityIndicator size="small" color="#112250" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#112250" />
                )}
                <Text style={styles.downloadText}>{format.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.slipBtn}
            onPress={handleDownloadSlip}
            disabled={downloadingSlip}
          >
            {downloadingSlip ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="document-text-outline" size={16} color="#fff" />
            )}
            <Text style={styles.slipText}>Salary Slip (PDF)</Text>
          </TouchableOpacity>

          <ReportPreview report={report} />
        </>
      )}

      <EmployeePickerModal
        visible={employeeModalVisible}
        employees={employees}
        selectedId={selectedEmployee?._id}
        onSelect={setSelectedEmployee}
        onClose={() => setEmployeeModalVisible(false)}
      />

      <PeriodPickerModal
        visible={periodModalVisible}
        initialStartDate={startDate}
        initialEndDate={endDate}
        onConfirm={(s, e, label) => {
          setStartDate(s);
          setEndDate(e);
          setPeriodLabel(label);
          setPeriodModalVisible(false);
        }}
        onClose={() => setPeriodModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  selectorLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  selectorValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    marginTop: 1,
  },

  generateBtn: {
    backgroundColor: "#112250",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },

  generateBtnDisabled: {
    opacity: 0.5,
  },

  generateText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  errorText: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },

  downloadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },

  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEECFF",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },

  downloadText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 13,
  },

  slipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#112250",
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    marginBottom: 16,
  },

  slipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
