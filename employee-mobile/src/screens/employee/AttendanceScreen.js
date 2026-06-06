import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import {Calendar} from "react-native-calendars";

import { useNavigation } from "@react-navigation/native";

import { useEffect, useState } from "react";


// For API calls and location
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import api from "../../api/api.js";

export default function AttendanceScreen() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const navigation = useNavigation();

  const hasPunchedIn =
    todayAttendance?.punchInTime &&
    !todayAttendance?.punchOutTime;

  const hasPunchedOut =
    todayAttendance?.punchInTime &&
    todayAttendance?.punchOutTime;

  const fetchTodayAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/attendance/today", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTodayAttendance(res.data);
    } catch (err) {
      console.log(err.response?.data || err.message);
    }
  };

  const fetchAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/attendance/my-attendance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAttendanceHistory(res.data);
    } catch (err) {
      console.log(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendance();
    fetchTodaysAttendance();
  }, []);

  const handlePunchIn = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission is required");
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      const res = await api.post(
        "/attendance/punch-in",
        {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(res.data.message);

      fetchTodayAttendance();
      fetchAttendance();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Punch in failed"
      );
    }
  };

  const handlePunchOut = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission is required");
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      const res = await api.post(
        "/attendance/punch-out",
        {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(res.data.message);

      fetchTodayAttendance();
      fetchAttendance();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Punch out failed"
      );
    }
  };
  

  const fetchTodaysAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/attendance/my-attendance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data;

      const formatted = {};

      data.forEach((item) => {
        const date = new Date(item.punchInTime)
          .toISOString()
          .split("T")[0];

        formatted[date] = {
          marked: true,
          dotColor: item.status === "late" ? "orange" : "green",
        };
      });

      setMarkedDates(formatted);
      console.log("Attendance data:", data);
      console.log("Marked dates:", formatted);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <ScrollView style={styles.container}>
      {/* Top Card */}
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Attendance</Text>

        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons
                name="location-outline"
                size={24}
                color="#fff"
              />
            </View>

            <View>
              <Text style={styles.locationTitle}>
                Current Location
              </Text>
              <Text style={styles.locationSubTitle}>
                Within Office Geofence
              </Text>
            </View>
          </View>

          <View style={styles.mapPlaceholder}>
            <Ionicons
              name="location-outline"
              size={40}
              color="#D8D4FF"
            />
          </View>

          <TouchableOpacity
            style={styles.punchButton}
            disabled={hasPunchedOut}
            onPress={
              hasPunchedIn
                ? handlePunchOut
                : handlePunchIn
            }
          >
            <Text style={styles.punchText}>
              {hasPunchedIn
                ? "Punch Out"
                : hasPunchedOut
                ? "Attendance Completed"
                : "Punch In"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>
          This Month
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#ECEAFF" },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#6C63FF"
              />
            </View>

            <Text style={styles.statNumber}>
              3
            </Text>
            <Text style={styles.statLabel}>
              Present
            </Text>
          </View>

          <View style={styles.statItem}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#FFECEC" },
              ]}
            >
              <MaterialIcons
                name="access-time"
                size={22}
                color="#FF5B5B"
              />
            </View>

            <Text style={styles.statNumber}>
              1
            </Text>
            <Text style={styles.statLabel}>
              Late
            </Text>
          </View>

          <View style={styles.statItem}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#EEF2F6" },
              ]}
            >
              <Feather
                name="x-circle"
                size={22}
                color="#7B8794"
              />
            </View>

            <Text style={styles.statNumber}>
              0
            </Text>
            <Text style={styles.statLabel}>
              Absent
            </Text>
          </View>
        </View>
      </View>

      {/* Attendance History */}
      
     
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>
          Attendance History
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("AttendanceHistory")}
        >
          <Ionicons
            name="chevron-forward-circle-outline"
            size={28}
            color="#6C63FF"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.historyCard}>
        {(attendanceHistory?.length ?? 0) === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20, color: "#777" }}>
          No attendance records found
        </Text>
      ) : (
        attendanceHistory
        .slice(0,4)
        .map((item) => {
          const date = new Date(item.punchInTime);

          return (
            <View key={item._id} style={styles.historyCard}>
              
              {/* LEFT SIDE */}
              <View style={styles.historyLeft}>
                <View style={styles.calendarCircle}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color="#6C63FF"
                  />
                </View>

                <View>
                  <Text style={styles.dateText}>
                    {date.toDateString()}
                  </Text>

                  <Text style={styles.notificationDate}>
                    Punch In: {date.toLocaleTimeString()}
                  </Text>
                </View>
              </View>

              {/* STATUS BADGE */}
              <View
                style={[
                  styles.presentBadge,
                  {
                    backgroundColor:
                      item.status === "late" ? "#FFECEC" : "#ECEAFF",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        item.status === "late" ? "#FF5B5B" : "#6C63FF",
                    },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })
      )}

        <View style={styles.presentBadge}>
          <Text style={styles.badgeText}>
            Present
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  headerCard: {
    backgroundColor: "#6C63FF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  heading: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 25,
  },

  locationContainer: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 24,
    padding: 20,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  locationTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  locationSubTitle: {
    color: "#E6E6FA",
    fontSize: 13,
  },

  mapPlaceholder: {
    height: 150,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  punchButton: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },

  punchText: {
    color: "#6C63FF",
    fontWeight: "700",
    fontSize: 18,
  },

  summaryCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  statItem: {
    alignItems: "center",
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },

  statLabel: {
    color: "#666",
    marginTop: 4,
  },

  historyTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginHorizontal: 20,
    marginBottom: 15,
  },

  historyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  calendarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1EEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  dateText: {
    fontSize: 16,
    fontWeight: "600",
  },

  dayText: {
    color: "#777",
    marginTop: 2,
  },

  presentBadge: {
    backgroundColor: "#ECEAFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  badgeText: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  
});