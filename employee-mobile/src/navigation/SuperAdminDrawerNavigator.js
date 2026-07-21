import React, { useContext } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../context/AuthContext";
import api from "../api/api.js";

import SuperAdminDashboard from "../screens/superadmin/Dashboard/SuperAdminDashboard";
import CompaniesStackNavigator from "../screens/superadmin/Companies/CompaniesStackNavigator";

const Drawer = createDrawerNavigator();

const NAV_ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline" },
  { name: "Companies", label: "Companies", icon: "business-outline" },
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
    } finally {
      await logout();
    }
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../assets/logo-navy.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>StaffTrack</Text>
      </View>

      <View style={styles.profileBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.fullName)}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.role}>Super Admin</Text>
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
                color={focused ? "#112250" : "#6B7280"}
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

export default function SuperAdminDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerType: "front" }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Dashboard" component={SuperAdminDashboard} />
      <Drawer.Screen name="Companies" component={CompaniesStackNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  brandLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },

  brandText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#112250",
    letterSpacing: 0.3,
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
    color: "#112250",
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
    color: "#112250",
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
