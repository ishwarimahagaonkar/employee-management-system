import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TravelScreen from "./TravelScreen";
import TravelDetailScreen from "./TravelDetailScreen";

const Stack = createNativeStackNavigator();

export default function TravelStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TravelList" component={TravelScreen} />
      <Stack.Screen name="TravelDetail" component={TravelDetailScreen} />
    </Stack.Navigator>
  );
}
