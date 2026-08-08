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
import KeyboardAwareScrollView from "../../../components/KeyboardAwareScrollView";
import LeaveForm from "./components/LeaveForm";
import LeaveHistoryCard from "./components/LeaveHistoryCard";
import HolidayList from "./components/HolidayList";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError.js";

const DEFAULT_PAID_ALLOTMENT = 12;

// Most recent leave requests shown in the history list.
const HISTORY_LIMIT = 5;

const calculateDays = (startISO, endISO) => {
  const diff = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1, 1);
};

export default function LeaveScreen() {
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [paidAllotment, setPaidAllotment] = useState(DEFAULT_PAID_ALLOTMENT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [leaveType, setLeaveType] = useState("Paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = async () => {
    try {
      setError(null);
      const res = await api.get("/leave/my-leaves");
      setLeaves(res.data.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchLeaves();
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get("/holidays");
      setHolidays(res.data.holidays || []);
    } catch (err) {
    }
  };

  const fetchLeaveSettings = async () => {
    try {
      const res = await api.get("/settings");
      const allotment = res.data?.data?.paidLeaveAllotment;
      if (typeof allotment === "number" && allotment >= 0) {
        setPaidAllotment(allotment);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchHolidays();
    fetchLeaveSettings();
  }, []);

  const daysTaken = (type) =>
    leaves
      .filter((l) => l.leaveType === type && l.status === "Approved")
      .reduce((sum, l) => sum + l.totalDays, 0);

  // Paid leave is a capped yearly allotment; unpaid leave has no cap,
  // so its card shows days taken instead of a remaining balance.
  const balances = {
    Paid: Math.max(paidAllotment - daysTaken("Paid"), 0),
    Unpaid: daysTaken("Unpaid"),
  };

  // Newest first, capped -- balances above still count every record.
  const recentLeaves = [...leaves]
    .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
    .slice(0, HISTORY_LIMIT);

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
    fetchHolidays();
    fetchLeaveSettings();
  };

  return (
    <View style={styles.container}>
      <LeaveHeader balances={balances} onApplyPress={() => setShowForm((prev) => !prev)} />

      {/* The apply form lives in this list. Unlike the Add Site and Add Meeting
          sheets this is a plain screen, so the window does resize for the
          keyboard -- but the Submit button sits directly under a multiline
          Reason field, and resizing alone never scrolls it back into view.
          Padding by the keyboard height is what makes it reachable. */}
      <KeyboardAwareScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            <HolidayList holidays={holidays} />

            <View style={styles.historyTitleRow}>
              <Text style={styles.historyTitle}>Leave History</Text>
              {leaves.length > recentLeaves.length && (
                <Text style={styles.historyCount}>
                  Latest {recentLeaves.length} of {leaves.length}
                </Text>
              )}
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : error ? (
              <ErrorState message={error} onRetry={retry} compact />
            ) : recentLeaves.length === 0 ? (
              <Text style={styles.emptyText}>No leave records found</Text>
            ) : (
              recentLeaves.map((item) => (
                <LeaveHistoryCard key={item._id} leave={item} onCancel={cancelLeave} />
              ))
            )}
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
