// LeaveScreen.js
import React, { useState, useEffect } from "react";
import styles from "./styles/LeaveStyles.js";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../api/api.js";

/* ================= COMPONENT ================= */

export default function LeaveScreen() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [leaveType, setLeaveType] = useState("Paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  /* ================= FETCH LEAVES ================= */
  const fetchLeaves = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.get("/leave/my-leaves", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLeaves(res.data.data || []);
    } catch (err) {
      console.log("FETCH ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  /* ================= APPLY LEAVE ================= */
  const applyLeave = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await api.post(
        "/leave/apply",
        {
          leaveType,
          startDate,
          endDate,
          totalDays: calculateDays(startDate, endDate),
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", res.data.message);

      setStartDate("");
      setEndDate("");
      setReason("");
      setLeaveType("Paid");
      setShowForm(false);

      fetchLeaves();
    } catch (err) {
      console.log("APPLY ERROR:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to apply leave");
    }
  };

  /* ================= CANCEL LEAVE ================= */
  const cancelLeave = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");

      await api.delete(`/leave/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Success", "Leave cancelled");
      fetchLeaves();
    } catch (err) {
      Alert.alert("Error", "Failed to cancel leave");
    }
  };

  /* ================= CALCULATE DAYS ================= */
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;

    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  /* ================= REFRESH ================= */
  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  /* ================= STATUS COLOR ================= */
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "#2ecc71";
      case "Rejected":
        return "#e74c3c";
      default:
        return "#f1c40f";
    }
  };

  /* ================= UI ================= */
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Leave Management</Text>
              {/* SUMMARY CARDS */}
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.count}>
              {leaves.filter(l => l.leaveType === "Paid").length}
            </Text>
            <Text>Paid Leave</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.count}>
              {leaves.filter(l => l.leaveType === "Unpaid").length}
            </Text>
            <Text>Unpaid Leave</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.applyText}>Apply Leave
          </Text>
        </TouchableOpacity>
      </View>



      {/* FORM */}
      <View style={{ margin: 20 }}>
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Apply Leave</Text>

            {/* TYPE */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  leaveType === "Paid" && styles.active,
                ]}
                onPress={() => setLeaveType("Paid")}
              >
                <Text>Paid</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  leaveType === "Unpaid" && styles.active,
                ]}
                onPress={() => setLeaveType("Unpaid")}
              >
                <Text>Unpaid</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Start Date (YYYY-MM-DD)"
              value={startDate}
              onChangeText={setStartDate}
              style={styles.input}
            />

            <TextInput
              placeholder="End Date (YYYY-MM-DD)"
              value={endDate}
              onChangeText={setEndDate}
              style={styles.input}
            />

            <TextInput
              placeholder="Reason"
              value={reason}
              onChangeText={setReason}
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={applyLeave}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Submit Leave
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* HISTORY */}
      {/* HISTORY */}
      <Text style={styles.historyTitle}>Leave History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : leaves.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No leave records found
        </Text>
      ) : (
        leaves.map((item) => (
          <View key={item._id} style={styles.leaveCard}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.leaveType}>
                {item.leaveType} Leave
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            {/* Dates */}
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>
              {item.startDate?.slice(0, 10)} → {item.endDate?.slice(0, 10)}
            </Text>

            {/* Reason */}
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{item.reason}</Text>

            {/* Days */}
            <Text style={styles.label}>Total Days</Text>
            <Text style={styles.value}>{item.totalDays}</Text>

            {item.status === "Pending" && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => cancelLeave(item._id)}
              >
                <Text style={styles.cancelText}>Cancel Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
        
      
    </ScrollView>
  );
};



