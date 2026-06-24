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

export default function MonthlyAttendance() {
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);

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
        if (status === "present") bgColor = "green";
        else if (status === "absent") bgColor = "red";
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
      console.log(err.response?.data || err.message);
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
        <Ionicons name="arrow-back" size={24} color="#6C63FF" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Monthly Attendance</Text>

      {/* CALENDAR */}
      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : (
        <Calendar
          markingType={"custom"}
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDay(day.dateString)}
          theme={{
            todayTextColor: "#6C63FF",
            arrowColor: "#6C63FF",
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
              <Text style={styles.detailText}>
                Status: {record.status}
              </Text>

              <Text style={styles.detailText}>
                Working Hours: {record.workingHours || 0} hrs
              </Text>

              {/* SAFE PUNCH IN */}
              {record.punchInTime && safeDate(record.punchInTime) && (
                <>
                  <Text style={styles.detailText}>
                    Punch In:{" "}
                    {safeDate(record.punchInTime).toLocaleTimeString()}
                  </Text>

                  {record.punchInLocation?.address && (
                    <Text style={styles.detailText}>
                      Address: {record.punchInLocation.address}
                    </Text>
                  )}
                </>
              )}

             {/* SAFE PUNCH OUT */}
              {record.punchOutTime && safeDate(record.punchOutTime) && (
                <>
                  <Text style={styles.detailText}>
                    Punch Out:{" "}
                    {safeDate(record.punchOutTime).toLocaleTimeString()}
                  </Text>

                  {record.punchOutLocation?.address && (
                    <Text style={styles.detailText}>
                      Address: {record.punchOutLocation.address}
                    </Text>
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
    color: "#6C63FF",
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
});