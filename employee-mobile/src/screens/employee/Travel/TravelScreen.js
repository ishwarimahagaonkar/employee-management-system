import React, { useState } from "react";
import { ScrollView, ActivityIndicator, View, Text, StyleSheet, Alert } from "react-native";

import TravelHeader from "./components/TravelHeader";
import TravelSummaryCard from "./components/TravelSummaryCard";
import TravelHistoryCard from "./components/TravelHistoryCard";
import MeetingDetailsModal from "./components/MeetingDetailsModal";
import useTravel from "./hooks/useTravel";

export default function TravelScreen() {
  const {
    todayTravel,
    history,
    loading,
    historyLoading,
    activeTrip,
    pendingMeetingTrip,
    btnLoading,
    currentTrip,
    startTrip,
    endTrip,
    logMeeting,
  } = useTravel();

  const [purpose, setPurpose] = useState("");
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const handleStart = () => {
    if (!purpose.trim()) {
      Alert.alert("Enter purpose");
      return;
    }
    startTrip(purpose, () => setPurpose(""));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TravelHeader
        activeTrip={activeTrip}
        currentTrip={currentTrip}
        purpose={purpose}
        setPurpose={setPurpose}
        btnLoading={btnLoading}
        pendingMeetingTrip={pendingMeetingTrip}
        onStart={handleStart}
        onEnd={() => endTrip()}
        onAddMeeting={() => setMeetingModalVisible(true)}
      />

      <TravelSummaryCard
        totalTrips={todayTravel?.totalTrips}
        totalDistanceKm={todayTravel?.totalDistanceKm}
      />

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Travel History</Text>

        {historyLoading ? (
          <ActivityIndicator size="large" color="#7C3AED" />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No travel records found</Text>
        ) : (
          history.map((trip) => (
            <TravelHistoryCard key={trip._id} trip={trip} />
          ))
        )}
      </View>

      <MeetingDetailsModal
        visible={meetingModalVisible}
        loading={btnLoading}
        onClose={() => setMeetingModalVisible(false)}
        onSubmit={(details) =>
          logMeeting(pendingMeetingTrip._id, details, () => setMeetingModalVisible(false))
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  historySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  historyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 14,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#9CA3AF",
  },
});
