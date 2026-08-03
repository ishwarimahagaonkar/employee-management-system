import React, { useState } from "react";
import { ScrollView, ActivityIndicator, View, Text, StyleSheet, Alert } from "react-native";

import TravelHeader from "./components/TravelHeader";
import TravelSummaryCard from "./components/TravelSummaryCard";
import TravelHistoryCard from "./components/TravelHistoryCard";
import MeetingDetailsModal from "./components/MeetingDetailsModal";
import TripDetailModal from "./components/TripDetailModal";
import CoTravelerPickerModal from "./components/CoTravelerPickerModal";
import useTravel from "./hooks/useTravel";
import ErrorState from "../../../components/ErrorState";

export default function TravelScreen() {
  const {
    todayTravel,
    history,
    historyTotal,
    loading,
    historyLoading,
    error,
    historyError,
    retry,
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
  const [detailTrip, setDetailTrip] = useState(null);
  const [coTravelers, setCoTravelers] = useState([]);
  const [coTravelerModalVisible, setCoTravelerModalVisible] = useState(false);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#112250" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ErrorState message={error} onRetry={retry} />
      </View>
    );
  }

  const handleStart = () => {
    if (!purpose.trim()) {
      Alert.alert("Enter purpose");
      return;
    }
    startTrip(purpose, coTravelers, () => {
      setPurpose("");
      setCoTravelers([]);
    });
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
        coTravelerCount={coTravelers.length}
        onAddCoTravelers={() => setCoTravelerModalVisible(true)}
        onStart={handleStart}
        onEnd={() => endTrip()}
        onAddMeeting={() => setMeetingModalVisible(true)}
      />

      <TravelSummaryCard
        totalTrips={todayTravel?.totalTrips}
        totalDistanceKm={todayTravel?.totalDistanceKm}
      />

      <View style={styles.historySection}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.historyTitle}>Travel History</Text>
          {historyTotal > history.length && (
            <Text style={styles.historyCount}>
              Latest {history.length} of {historyTotal}
            </Text>
          )}
        </View>

        {historyLoading ? (
          <ActivityIndicator size="large" color="#112250" />
        ) : historyError ? (
          <ErrorState message={historyError} onRetry={retry} compact />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No travel records found</Text>
        ) : (
          history.map((trip) => (
            <TravelHistoryCard key={trip._id} trip={trip} onPress={setDetailTrip} />
          ))
        )}
      </View>

      {/* Only mounted when there is actually a trip to log against.
          pendingMeetingTrip can become null while the sheet is open -- a
          background refresh lands, or the day rolls over -- and reading
          ._id off null threw straight through the press handler into the
          error boundary, which users reported as the app crashing. */}
      <MeetingDetailsModal
        visible={meetingModalVisible && !!pendingMeetingTrip}
        loading={btnLoading}
        onClose={() => setMeetingModalVisible(false)}
        onSubmit={(details) => {
          if (!pendingMeetingTrip) {
            setMeetingModalVisible(false);
            return;
          }
          logMeeting(pendingMeetingTrip._id, details, () => setMeetingModalVisible(false));
        }}
      />

      <TripDetailModal
        visible={!!detailTrip}
        trip={detailTrip}
        onClose={() => setDetailTrip(null)}
      />

      <CoTravelerPickerModal
        visible={coTravelerModalVisible}
        selectedIds={coTravelers}
        onConfirm={(ids) => {
          setCoTravelers(ids);
          setCoTravelerModalVisible(false);
        }}
        onClose={() => setCoTravelerModalVisible(false)}
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

  historyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  historyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  historyCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#9CA3AF",
  },
});
