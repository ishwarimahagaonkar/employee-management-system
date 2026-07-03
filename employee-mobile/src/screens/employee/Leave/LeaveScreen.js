// LeaveScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
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

      {/* APPLY SECTION */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Apply Leave</Text>

        {/* TYPE */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, leaveType === "Paid" && styles.active]}
            onPress={() => setLeaveType("Paid")}
          >
            <Text>Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, leaveType === "Unpaid" && styles.active]}
            onPress={() => setLeaveType("Unpaid")}
          >
            <Text>Unpaid</Text>
          </TouchableOpacity>
        </View>

        {/* DATES */}
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

        {/* REASON */}
        <TextInput  
          placeholder="Reason"
          value={reason}
          onChangeText={setReason}
          style={styles.input}
        />

        {/* BUTTON */}
        <TouchableOpacity style={styles.button} onPress={applyLeave}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Submit Leave
          </Text>
        </TouchableOpacity>
      </View>

      {/* HISTORY */}
      <Text style={styles.historyTitle}>My Leaves</Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        leaves.map((item) => (
          <View key={item._id} style={styles.leaveCard}>
            <Text style={styles.leaveType}>{item.leaveType} Leave</Text>

            <Text>
              {item.startDate?.slice(0, 10)} → {item.endDate?.slice(0, 10)}
            </Text>

            <Text style={{ color: getStatusColor(item.status) }}>
              {item.status}
            </Text>

            {item.status === "Pending" && (
              <TouchableOpacity
                onPress={() => cancelLeave(item._id)}
                style={styles.cancelBtn}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};



/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f5f6fa",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    flex: 1,
    margin: 5,
    borderRadius: 10,
    alignItems: "center",
  },

  count: {
    fontSize: 20,
    fontWeight: "bold",
  },

  form: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  typeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  typeBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    margin: 5,
    borderRadius: 8,
    alignItems: "center",
  },

  active: {
    backgroundColor: "#ddd",
  },

  input: {
    borderWidth: 1,
    marginVertical: 5,
    padding: 10,
    borderRadius: 8,
  },

  button: {
    backgroundColor: "blue",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },

  leaveCard: {
    backgroundColor: "#fff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
  },

  leaveType: {
    fontWeight: "bold",
  },

  cancelBtn: {
    backgroundColor: "red",
    padding: 8,
    marginTop: 10,
    borderRadius: 6,
    alignItems: "center",
  },
});