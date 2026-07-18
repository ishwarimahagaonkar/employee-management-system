import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TravelSummaryCards from "./components/TravelSummaryCards";
import ActiveTripCard from "./components/ActiveTripCard";
import TravelHistoryListCard from "./components/TravelHistoryListCard";
import useAdminTravel from "./hooks/useAdminTravel";

export default function TravelScreen({ navigation }) {
  const {
    loading,
    totalDistanceKm,
    activeTripsCount,
    completedTripsCount,
    trips,
    activeTrips,
  } = useAdminTravel();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.getParent()?.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TravelSummaryCards
            totalDistanceKm={totalDistanceKm}
            activeTripsCount={activeTripsCount}
            completedTripsCount={completedTripsCount}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Trips</Text>
            {activeTrips.length === 0 ? (
              <Text style={styles.emptyText}>No active trips</Text>
            ) : (
              activeTrips.map((trip) => <ActiveTripCard key={trip._id} trip={trip} />)
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel History</Text>
            {trips.length === 0 ? (
              <Text style={styles.emptyText}>No travel records found</Text>
            ) : (
              trips.map((trip) => (
                <TravelHistoryListCard
                  key={trip._id}
                  trip={trip}
                  onPress={(t) => navigation.navigate("TravelDetail", { trip: t })}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  loader: {
    marginTop: 40,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 14,
  },

  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 10,
  },
});
