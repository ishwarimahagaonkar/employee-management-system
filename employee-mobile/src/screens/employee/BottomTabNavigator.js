import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";

import EmployeeDashboard from "./Home/EmployeeDashboard";
import AttendanceScreen from "./Attendance/AttendanceScreen";
import TravelScreen from "./Travel/TravelScreen";
import LeaveScreen from "./Leave/LeaveScreen";
import ProfileScreen from "./ProfileScreen";
import { AuthContext } from "../../context/AuthContext";
import { withErrorBoundary } from "../../components/ErrorBoundary";

const Tab = createBottomTabNavigator();

// Each tab is guarded on its own so a crash in one screen shows an error there
// and leaves the tab bar -- and every other screen -- usable.
const HomeTab = withErrorBoundary(EmployeeDashboard, "Home");
const AttendanceTab = withErrorBoundary(AttendanceScreen, "Attendance");
const TravelTab = withErrorBoundary(TravelScreen, "Travel");
const LeaveTab = withErrorBoundary(LeaveScreen, "Leave");
const ProfileTab = withErrorBoundary(ProfileScreen, "Profile");

export default function BottomTabNavigator() {
  const { user } = useContext(AuthContext);
  const isPremium = user?.company?.plan !== "Standard";

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

        tabBarActiveTintColor: "#112250",
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
        component={HomeTab}
      />

      <Tab.Screen
        name="Attendance"
        component={AttendanceTab}
      />

      {isPremium && (
        <Tab.Screen
          name="Travel"
          component={TravelTab}
        />
      )}

      <Tab.Screen
        name="Leave"
        component={LeaveTab}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileTab}
      />
    </Tab.Navigator>
  );
}