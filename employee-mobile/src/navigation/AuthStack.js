import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";

const Stack = createNativeStackNavigator();

// Login only. The signed-in navigators are chosen by role in AppNavigator, so
// this stack deliberately holds nothing else -- a commented-out BottomTabs
// screen and its import lived here and were removed: dead, but enough to make
// this file look like a third place the tabs were mounted.
export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}