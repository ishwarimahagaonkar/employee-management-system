import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {useFocusEffect} from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../api/api.js";
import { formatHoursToHMS } from "../../../utils/formatTime.js";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError.js";

export default function MonthlyAttendance() {
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      fetchAttendance();
    }, [])
  );

  // ---------------- SAFE DATE HELPER ----------------
  const safeDate = (value) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  // ---------------- FETCH ATTENDANCE ----------------
  const fetchAttendance = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/attendance/my-attendance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data || [];
      setAttendanceData(data);

      const formatted = {};

      data.forEach((item) => {
        if (!item?.punchInTime) return;

        const punchDate = safeDate(item.punchInTime);
        if (!punchDate) return;

        const date = punchDate.toISOString().split("T")[0];
        const status = item.status?.toLowerCase() || "";

        let bgColor = "#E0E0E0";
        if (status === "present" || status === "approved") bgColor = "green";
        else if (status === "rejected" || status === "absent") bgColor = "red";
        else if (status === "late") bgColor = "blue";

        formatted[date] = {
          customStyles: {
            container: {
              backgroundColor: bgColor,
              borderRadius: 6,
            },
            text: {
              color: "white",
              fontWeight: "700",
            },
          },
        };
      });

      setMarkedDates(formatted);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ---------------- GET DAY DETAILS (SAFE) ----------------
  const getDayDetails = (dateString) => {
    return (
      attendanceData.find((item) => {
        if (!item?.punchInTime) return false;

        const date = safeDate(item.punchInTime);
        if (!date) return false;

        return date.toISOString().split("T")[0] === dateString;
      }) || null
    );
  };

  // ---------------- UI ----------------
  const record = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#112250" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Monthly Attendance</Text>

      {/* CALENDAR */}
      {loading ? (
        <ActivityIndicator size="large" color="#112250" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAttendance} compact />
      ) : (
        <Calendar
          markingType={"custom"}
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDay(day.dateString)}
          theme={{
            todayTextColor: "#112250",
            arrowColor: "#112250",
            textDayFontWeight: "600",
            textMonthFontWeight: "700",
          }}
        />
      )}

      {/* DETAILS */}
      {selectedDay && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>
            Details for {selectedDay}
          </Text>

          {record ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    record.status === "late" && styles.statusLate,
                    record.status === "rejected" && styles.statusRejected,
                  ]}
                >
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Working Hours</Text>
                <Text style={styles.detailValue}>
                  {formatHoursToHMS(record.workingHours)}
                </Text>
              </View>

              {/* SAFE PUNCH IN */}
              {record.punchInTime && safeDate(record.punchInTime) && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Punch In</Text>
                    <Text style={styles.detailValue}>
                      {safeDate(record.punchInTime).toLocaleTimeString()}
                    </Text>
                  </View>

                  {record.punchInLocation?.address && (
                    <View style={styles.addressRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.addressValue}>
                        {record.punchInLocation.address}
                      </Text>
                    </View>
                  )}
                </>
              )}

             {/* SAFE PUNCH OUT */}
              {record.punchOutTime && safeDate(record.punchOutTime) && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Punch Out</Text>
                    <Text style={styles.detailValue}>
                      {safeDate(record.punchOutTime).toLocaleTimeString()}
                    </Text>
                  </View>

                  {record.punchOutLocation?.address && (
                    <View style={styles.addressRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.addressValue}>
                        {record.punchOutLocation.address}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <Text style={styles.detailText}>
              No record found
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  backText: {
    marginLeft: 6,
    color: "#112250",
    fontWeight: "600",
    fontSize: 16,
  },

  header: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  detailCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },

  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  detailText: {
    fontSize: 16,
    marginBottom: 4,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },

  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E1B4B",
  },

  statusValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16A34A",
    textTransform: "capitalize",
  },

  statusLate: {
    color: "#D97706",
  },

  statusRejected: {
    color: "#DC2626",
  },

  addressRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },

  addressValue: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },
});