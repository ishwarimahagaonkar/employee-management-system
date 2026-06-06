import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import EmployeeDashboard from "./EmployeeDashboard";
import AttendanceScreen from "./AttendanceScreen";
import TravelScreen from "./TravelScreen";
import LeaveScreen from "./LeaveScreen";
import ProfileScreen from "./ProfileScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Attendance") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Travel") {
            iconName = focused ? "location" : "location-outline";
          } else if (route.name === "Leave") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={22}
              color={color}
            />
          );
        },

        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#6B7280",

        tabBarStyle: {
          height: 75,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 10,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={EmployeeDashboard}
      />

      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
      />

      <Tab.Screen
        name="Travel"
        component={TravelScreen}
      />

      <Tab.Screen
        name="Leave"
        component={LeaveScreen}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}