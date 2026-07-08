import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../context/AuthContext";
import api from "../api/api.js";

import AdminDashboard from "../screens/admin/AdminDashboard";
import EmployeesScreen from "../screens/admin/Employees/EmployeesScreen";
import AttendanceScreen from "../screens/admin/Attendance/AttendanceScreen";
import TravelStackNavigator from "../screens/admin/Travel/TravelStackNavigator";
import LeaveScreen from "../screens/admin/Leave/LeaveScreen";
import ReportScreen from "../screens/admin/Report/ReportScreen";
import SettingsScreen from "../screens/admin/Settings/SettingsScreen";

const Drawer = createDrawerNavigator();

const NAV_ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline" },
  { name: "Employees", label: "Employees", icon: "people-outline" },
  { name: "Attendance", label: "Attendance", icon: "time-outline" },
  { name: "Travel", label: "Travel", icon: "location-outline" },
  { name: "Leave", label: "Leave", icon: "calendar-outline" },
  { name: "Report", label: "Report", icon: "document-text-outline" },
  { name: "Settings", label: "Settings", icon: "settings-outline" },
];

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      await logout();
    }
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.profileBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.fullName)}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.role}>Administrator</Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.itemsList}>
        {NAV_ITEMS.map((item) => {
          const focused = props.state.routeNames[props.state.index] === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.item, focused && styles.itemActive]}
              onPress={() => props.navigation.navigate(item.name)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={focused ? "#6D5DF6" : "#6B7280"}
                style={styles.itemIcon}
              />
              <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.itemIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function AdminDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerType: "front" }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboard} />
      <Drawer.Screen name="Employees" component={EmployeesScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="Travel" component={TravelStackNavigator} />
      <Drawer.Screen name="Leave" component={LeaveScreen} />
      <Drawer.Screen name="Report" component={ReportScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  profileBlock: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  avatarText: {
    color: "#6D5DF6",
    fontSize: 20,
    fontWeight: "700",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  role: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  itemsList: {
    paddingTop: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 10,
  },

  itemActive: {
    backgroundColor: "#EEECFF",
  },

  itemIcon: {
    marginRight: 14,
  },

  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  itemLabelActive: {
    color: "#6D5DF6",
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F5",
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
});
