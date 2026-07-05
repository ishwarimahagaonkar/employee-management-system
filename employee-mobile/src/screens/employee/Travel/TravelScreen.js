import React, { useState } from "react";
import { ScrollView, ActivityIndicator, View, Text, StyleSheet } from "react-native";

import TravelHeader from "./components/TravelHeader";
import TravelSummaryCard from "./components/TravelSummaryCard";
import TravelHistoryCard from "./components/TravelHistoryCard";
import useTravel from "./hooks/useTravel";

export default function TravelScreen() {
  const {
    todayTravel,
    history,
    loading,
    historyLoading,
    activeTrip,
    btnLoading,
    currentTrip,
    startTrip,
    endTrip,
  } = useTravel();

  const [purpose, setPurpose] = useState("");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TravelHeader
        activeTrip={activeTrip}
        currentTrip={currentTrip}
        purpose={purpose}
        setPurpose={setPurpose}
        btnLoading={btnLoading}
        onStart={() => startTrip(purpose, () => setPurpose(""))}
        onEnd={endTrip}
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
