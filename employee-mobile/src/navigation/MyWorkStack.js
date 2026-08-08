import React from "react";
import { TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import BottomTabNavigator from "../screens/employee/BottomTabNavigator";
import MonthlyAttendance from "../screens/employee/Attendance/MonthlyAttendance";

const Stack = createNativeStackNavigator();

/**
 * "My Work" for a manager or supervisor: their own attendance, travel and
 * leave, exactly as an employee sees them.
 *
 * This exists because the drawers used to point straight at BottomTabNavigator
 * with no stack around it, which broke two things at once:
 *
 *   - The "Attendance History" arrow calls navigate("MonthlyAttendance").
 *     That route is registered in MainStack, which only wraps role
 *     "employee" -- so for a manager or supervisor the screen did not exist
 *     and the tap silently did nothing. React Navigation does not throw for an
 *     unknown route here, which is why it looked like a dead button rather
 *     than an error.
 *   - With no stack there was nothing to go back to, so My Work was a
 *     dead end reachable only via the drawer.
 *
 * Employees keep using MainStack, which already provides the same two screens.
 * Sharing one component rather than duplicating the tab navigator keeps the
 * personal-work experience identical for every role.
 */

// Returns to whatever drawer screen was open before My Work. goBack() bubbles
// out of this stack to the drawer, so it lands on the previous destination
// rather than always forcing Dashboard. The fallback covers the case where My
// Work was the first screen opened and there is no history to return to.
function BackToDrawer({ navigation }) {
  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("Dashboard");
    }
  };

  return (
    <TouchableOpacity
      onPress={goBack}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
    </TouchableOpacity>
  );
}

export default function MyWorkStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BottomTabs"
        component={BottomTabNavigator}
        options={({ navigation }) => ({
          title: "My Work",
          headerTitleStyle: { color: "#1E1B4B", fontSize: 17, fontWeight: "700" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F4F6F8" },
          headerLeft: () => <BackToDrawer navigation={navigation} />,
        })}
      />

      {/* Pushed, so its back button is the stack's own and returns here. */}
      <Stack.Screen
        name="MonthlyAttendance"
        component={MonthlyAttendance}
        options={{
          title: "Attendance History",
          headerTitleStyle: { color: "#1E1B4B", fontSize: 17, fontWeight: "700" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F4F6F8" },
          headerTintColor: "#1E1B4B",
        }}
      />
    </Stack.Navigator>
  );
}
