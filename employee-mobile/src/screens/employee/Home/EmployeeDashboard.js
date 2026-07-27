import React, { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, ScrollView, ActivityIndicator, StyleSheet } from "react-native";

import { AuthContext } from "../../../context/AuthContext";
import DashboardHeader from "./components/DashboardHeader";
import StatCard from "./components/StatCard";
import useDashboard from "./hooks/useDashboard";
import ErrorState from "../../../components/ErrorState";

export default function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const { loading, error, retry, fullName, checkedIn, presentDays, lateMarks, leaveBalance, travelKm } = useDashboard();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <DashboardHeader name={fullName || user?.fullName} checkedIn={checkedIn} />

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} compact />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar-outline"
              iconColor="#112250"
              iconBg="#EEECFF"
              value={presentDays}
              label="Present Days"
            />
            <StatCard
              icon="time-outline"
              iconColor="#EF4444"
              iconBg="#FEE2E2"
              value={lateMarks}
              label="Late Marks"
            />
            <StatCard
              icon="trending-up-outline"
              iconColor="#0D9488"
              iconBg="#CCFBF1"
              value={leaveBalance}
              label="Leave Balance"
            />
            <StatCard
              icon="location-outline"
              iconColor="#112250"
              iconBg="#EDE9FE"
              value={travelKm.toFixed(1)}
              label="Travel (km)"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  loader: {
    marginTop: 40,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
});
