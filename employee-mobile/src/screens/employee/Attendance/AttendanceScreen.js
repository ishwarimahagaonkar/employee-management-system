// AttendanceScreen.js
import React, { useEffect, useState, useRef } from "react";
import styles from "./styles/AttendanceStyles.js";

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";

import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { CameraView, Camera } from "expo-camera";   // ✅ Correct imports
import api from "../../../api/api.js";
import AttendanceCard from "./AttendanceCard.js";
import MonthlyAttendance from "./MonthlyAttendance.js";
import EmergencyRequestModal from "./EmergencyRequestModal.js";

export default function AttendanceScreen() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayTravel, setTodayTravel] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [cameraPermission, setCameraPermission] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [emergencyType, setEmergencyType] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const cameraRef = useRef(null);   // ✅ Proper ref
  const cameraReadyRef = useRef(false);
  const navigation = useNavigation();

  const hasPunchedIn =
    Boolean(todayAttendance?.punchInTime && !todayAttendance?.punchOutTime);
  const hasPunchedOut =
    Boolean(todayAttendance?.punchInTime && todayAttendance?.punchOutTime);

  // A site punch-out is unlocked once the employee has submitted the meeting
  // record for one of today's completed trips.
  const meetingSubmitted = Boolean(
    todayTravel?.trips?.some(
      (t) => t.endTime && t.meetingDetails && t.meetingDetails.customerName
    )
  );
  
    

  // Monthly summary counts
  const presentCount =
    attendanceHistory.filter((item) => ["present", "approved"].includes(item.status?.toLowerCase())).length || 0;
  const lateCount =
    attendanceHistory.filter((item) => item.status?.toLowerCase() === "late").length || 0;
  const absentCount =
    attendanceHistory.filter((item) => item.status?.toLowerCase() === "absent").length || 0;

  // Unified fetch
  const fetchAttendanceData = async () => {
    try {
      
      const token = await AsyncStorage.getItem("token");

      const [todayRes, historyRes, travelRes] = await Promise.all([
        api.get("/attendance/today", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/attendance/my-attendance", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/travel/today", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setTodayAttendance(todayRes.data);
      setAttendanceHistory(historyRes.data);
      setTodayTravel(travelRes.data?.data || null);

      // Format marked dates
      const formatted = {};
      historyRes.data.forEach((item) => {
        if (!item.punchInTime) return;
        const date = new Date(item.punchInTime).toISOString().split("T")[0];
        formatted[date] = {
          marked: true,
          dotColor: item.status === "late" ? "orange" : "green",
        };
      });
      setMarkedDates(formatted);
    } catch (err) {
    } finally {
      setLoading(false);
    }
    
  };

  useEffect(() => {
    fetchAttendanceData();
       const requestPermissions = async () => {
        const camera = await Camera.requestCameraPermissionsAsync();
        const location = await Location.requestForegroundPermissionsAsync();
       
        setCameraPermission(camera.granted);
        setLocationPermission(location.granted);
      };

      requestPermissions();
      fetchAttendanceData();
  }, []);

  const handlePunch = async (type) => {
    let capturedLocation = null;
    let photo = null;

    try {
      setPunchLoading(true);

// Camera permission
    const cameraPermission =
      await Camera.getCameraPermissionsAsync();

    let cameraGranted = cameraPermission.granted;

    if (!cameraGranted && cameraPermission.canAskAgain) {
      const result =
        await Camera.requestCameraPermissionsAsync();
      cameraGranted = result.granted;
    }

    // Location permission
    const locationPermission =
      await Location.getForegroundPermissionsAsync();

    let locationGranted = locationPermission.granted;

    if (!locationGranted && locationPermission.canAskAgain) {
      const result =
        await Location.requestForegroundPermissionsAsync();
      locationGranted = result.granted;
    }

    if (!cameraGranted || !locationGranted) {
      Alert.alert(
        "Permissions Required",
        "Camera and Location permissions are required.",
        [
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }
      // Show the camera and wait until it reports ready (up to 7s) instead
      // of a fixed delay — takePictureAsync throws if the camera is still
      // starting up, which made first punches of the day fail.
      cameraReadyRef.current = false;
      setShowCamera(true);
      const readyDeadline = Date.now() + 7000;
      while (!cameraReadyRef.current && Date.now() < readyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Capture selfie. Compressed: a full-quality photo is several MB of
      // base64 and times out on slow mobile networks.
      if (cameraRef.current && cameraReadyRef.current) {
        photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.2,
        });

        // Close camera after capture
        setShowCamera(false);
      }

      // Get location: balanced accuracy with a timeout, falling back to the
      // last known position so a cold GPS start doesn't fail the punch.
      let location;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("location-timeout")), 10000)
          ),
        ]);
      } catch (locErr) {
        location = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (!location) {
          throw new Error(
            "Could not get your location. Please move to an open area and try again."
          );
        }
      }

      let readableAddress = "Address unavailable";

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses.length > 0) {
          const address = addresses[0];
          readableAddress = [
            address.name,
            address.street,
            address.district,
            address.city,
            address.region,
            address.postalCode,
            address.country,
          ]
            .filter(Boolean)
            .join(", ");
        }
      } catch (err) {
      }

      capturedLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: readableAddress,
      };

      // Send to backend
      const token = await AsyncStorage.getItem("token");
      const res = await api.post(
        `/attendance/${type}`,
        {
          ...capturedLocation,
          photo: photo ? photo.base64 : null,
        },
        // Longer timeout than the api default: this request carries the
        // selfie payload and mobile uplinks can be slow.
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );

      alert(res.data.message);
      await fetchAttendanceData();
    } catch (err) {
      if (err.response?.data?.outsideLocation && capturedLocation) {
        setEmergencyType(type);
        setPendingLocation(capturedLocation);
        setPendingPhoto(photo);
        setEmergencyModalVisible(true);
      } else if (err.code === "ECONNABORTED" || err.message === "Network Error") {
        // The server may have recorded the punch even though the response
        // never arrived — refresh so the button state reflects reality.
        alert(
          "Network problem while submitting. Please check your internet connection and try again."
        );
        await fetchAttendanceData();
      } else {
        alert(err.response?.data?.message || err.message || `${type} failed`);
      }
    } finally {
      setShowCamera(false);
      setPunchLoading(false);
    }
  };

  const submitEmergencyRequest = async (reason) => {
    try {
      setEmergencyLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await api.post(
        "/attendance/emergency-request",
        {
          type: emergencyType,
          reason,
          ...pendingLocation,
          photo: pendingPhoto ? pendingPhoto.base64 : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setEmergencyModalVisible(false);
      await fetchAttendanceData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send request");
    } finally {
      setEmergencyLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Top Card */}
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Attendance</Text>
        <View style={styles.locationContainer}>
          {/* Location */}
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.locationTitle}>Mark Attendance</Text>
              <Text style={styles.locationSubTitle}>Within Office Geofence</Text>
            </View>
          </View>

          {/* Camera Preview */}
          <View style={styles.mapPlaceholder}>
            {showCamera ? (
              <CameraView
                style={{ width: "100%", height: "100%", borderRadius: 18 }}
                ref={cameraRef}
                facing="front"
                onCameraReady={() => {
                  cameraReadyRef.current = true;
                }}
              />
            ) : punchLoading ? (
              <>
                <ActivityIndicator size="small" color="#ffffffb7" />
                <Text style={styles.processingText}>Processing...</Text>
              </>
            ) : (
              <Ionicons name="camera-outline" size={40} color="#ffffffb7" />
            )}
          </View>

          <TouchableOpacity
            style={styles.punchButton}
            disabled={hasPunchedOut || punchLoading}
            onPress={() => {
              hasPunchedIn
                ? handlePunch("punch-out")
                : handlePunch("punch-in");
            }}
          >
            {punchLoading ? (
              <View style={styles.punchLoadingRow}>
                <ActivityIndicator size="small" color="#112250" />
                <Text style={styles.punchText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.punchText}>
                {hasPunchedIn
                  ? "Punch Out"
                  : hasPunchedOut
                  ? "Attendance Completed"
                  : "Punch In"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Site punch-out: for employees finishing at the client site.
              Enabled only after the trip's meeting record is submitted. */}
          {hasPunchedIn && (
            <>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 12,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.55)",
                  backgroundColor: meetingSubmitted ? "rgba(255,255,255,0.15)" : "transparent",
                  opacity: meetingSubmitted && !punchLoading ? 1 : 0.55,
                }}
                disabled={!meetingSubmitted || punchLoading}
                onPress={() => handlePunch("site-punch-out")}
              >
                <Ionicons name="briefcase-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  Punch Out from Site
                </Text>
              </TouchableOpacity>

              {!meetingSubmitted && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 12,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Submit your trip's meeting record to enable site punch-out.
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.statsRow}>
          {/* Present */}
          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: "#ECEAFF" }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#08009f80" />
            </View>
            <Text style={styles.count}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          {/* Late */}
          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: "#FFECEC" }]}>
              <MaterialIcons name="access-time" size={22} color="#ff5b5b8a" />
            </View>
            <Text style={styles.count}>{lateCount}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          {/* Absent */}
          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: "#EEF2F6" }]}>
              <Feather name="x-circle" size={22} color="#7B8794" />
            </View>
            <Text style={styles.count}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </View>

      {/* Attendance History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Attendance History</Text>
        <TouchableOpacity onPress={() => navigation.navigate("MonthlyAttendance")}>
          <Ionicons name="chevron-forward-circle-outline" style={styles.navigateIcon} size={28} color="#6a697d" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={{ marginTop: 20 }} />
      ) : attendanceHistory.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20, color: "#777" }}>
          No attendance records found
        </Text>
      ) : (
        attendanceHistory
          .sort((a, b) => new Date(b.punchInTime) - new Date(a.punchInTime))
          .slice(0, 3)
          .map((item) => {
            const punchInDate = new Date(item.punchInTime);
            const punchOutDate = item.punchOutTime ? new Date(item.punchOutTime) : null;
            return (
              <AttendanceCard
                key={item._id}
                date={punchInDate.toDateString()}
                punchIn={punchInDate.toLocaleTimeString()}
                punchOut={punchOutDate ? punchOutDate.toLocaleTimeString() : null}
                status={item.status}
              />
            );
          })
      )}

      <View style={{ height: 100 }} />

      <EmergencyRequestModal
        visible={emergencyModalVisible}
        type={emergencyType}
        loading={emergencyLoading}
        onClose={() => setEmergencyModalVisible(false)}
        onSubmit={submitEmergencyRequest}
      />
    </ScrollView>
  );
}


