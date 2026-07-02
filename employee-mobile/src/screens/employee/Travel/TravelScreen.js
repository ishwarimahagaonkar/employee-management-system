import React, { useState } from "react";
import { ScrollView, ActivityIndicator, View } from "react-native";

import HeaderCard from "./components/HeaderCard";
import SummaryCard from "./components/SummaryCard";
import StartTripModal from "./components/StartTripModal";
import useTravel from "./hooks/useTravel";

export default function TravelScreen() {
  const {
    todayTravel,
    loading,
    activeTrip,
    btnLoading,
    currentPurpose,
    startTrip,
    endTrip,
  } = useTravel();

  const [showModal, setShowModal] = useState(false);
  const [purpose, setPurpose] = useState("");

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <HeaderCard
        activeTrip={activeTrip}
        currentPurpose={currentPurpose}
        onStartPress={() => setShowModal(true)}
        onEndPress={endTrip}
      />

      <SummaryCard todayTravel={todayTravel} />

      <StartTripModal
        visible={showModal}
        purpose={purpose}
        setPurpose={setPurpose}
        loading={btnLoading}
        onClose={() => setShowModal(false)}
        onStart={() =>
          startTrip(purpose, () => {
            setShowModal(false);
            setPurpose("");
          })
        }
      />
    </ScrollView>
  );
}