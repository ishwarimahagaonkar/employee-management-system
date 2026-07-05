import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import styles from "./styles/LeaveStyles.js";
import api from "../../../api/api.js";
import LeaveHeader from "./components/LeaveHeader";
import LeaveForm from "./components/LeaveForm";
import LeaveHistoryCard from "./components/LeaveHistoryCard";

const PAID_ALLOTMENT = 12;

const calculateDays = (startISO, endISO) => {
  const diff = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1, 1);
};

export default function LeaveScreen() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [leaveType, setLeaveType] = useState("Paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave/my-leaves");
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

  const daysTaken = (type) =>
    leaves
      .filter((l) => l.leaveType === type && l.status === "Approved")
      .reduce((sum, l) => sum + l.totalDays, 0);

  // Paid leave is a capped yearly allotment; unpaid leave has no cap,
  // so its card shows days taken instead of a remaining balance.
  const balances = {
    Paid: Math.max(PAID_ALLOTMENT - daysTaken("Paid"), 0),
    Unpaid: daysTaken("Unpaid"),
  };

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setLeaveType("Paid");
  };

  const applyLeave = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      const res = await api.post("/leave/apply", {
        leaveType,
        startDate,
        endDate,
        totalDays: calculateDays(startDate, endDate),
        reason,
      });

      Alert.alert("Success", res.data.message);
      resetForm();
      setShowForm(false);
      fetchLeaves();
    } catch (err) {
      console.log("APPLY ERROR:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to apply leave");
    }
  };

  const cancelLeave = async (id) => {
    try {
      await api.delete(`/leave/${id}`);
      Alert.alert("Success", "Leave cancelled");
      fetchLeaves();
    } catch (err) {
      Alert.alert("Error", "Failed to cancel leave");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  return (
    <View style={styles.container}>
      <LeaveHeader balances={balances} onApplyPress={() => setShowForm((prev) => !prev)} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {showForm ? (
          <LeaveForm
            leaveType={leaveType}
            setLeaveType={setLeaveType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            reason={reason}
            setReason={setReason}
            onSubmit={applyLeave}
            onClose={() => setShowForm(false)}
          />
        ) : (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Leave History</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : leaves.length === 0 ? (
              <Text style={styles.emptyText}>No leave records found</Text>
            ) : (
              leaves.map((item) => (
                <LeaveHistoryCard key={item._id} leave={item} onCancel={cancelLeave} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
