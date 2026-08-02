import React, { useContext } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import AuthStack from "./AuthStack";
import MainStack from "./MainStack";
import AdminDrawerNavigator from "./AdminDrawerNavigator";
import ManagerDrawerNavigator from "./ManagerDrawerNavigator";
import SupervisorDrawerNavigator from "./SupervisorDrawerNavigator";
import SuperAdminDrawerNavigator from "./SuperAdminDrawerNavigator";
import ErrorState from "../components/ErrorState";

import { AuthContext } from "../context/AuthContext";

// Restoring the session hits the network, so this can be on screen for a
// moment. It used to render nothing at all, which looked like the app had
// frozen on a blank screen.
function StartupScreen() {
  return (
    <View style={styles.startup}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

// A stored token whose account couldn't be loaded. Retry rather than force a
// re-login (the usual cause is a temporary network failure), but always leave a
// way out -- without one this state has no exit, since the login screen only
// shows when there's no token.
function SessionRecoveryScreen({ message, onRetry, onLogout }) {
  return (
    <View style={styles.recovery}>
      <ErrorState
        message={message || "We couldn't load your account. Check your connection and try again."}
        onRetry={onRetry}
      />
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Log in as someone else</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { token, user, loading, sessionError, retrySession, logout } = useContext(AuthContext);

  if (loading) {
    return <StartupScreen />;
  }

  const renderApp = () => {
    if (!token) return <AuthStack />;

    // Every branch below keys off the role, so never guess at it: falling
    // through to the employee app dropped admins into the wrong UI.
    if (!user) {
      return (
        <SessionRecoveryScreen message={sessionError} onRetry={retrySession} onLogout={logout} />
      );
    }

    if (user.role === "superadmin") return <SuperAdminDrawerNavigator />;
    if (user.role === "admin") return <AdminDrawerNavigator />;
    if (user.role === "manager") return <ManagerDrawerNavigator />;
    if (user.role === "supervisor") return <SupervisorDrawerNavigator />;
    if (user.role === "employee") return <MainStack />;

    // An unrecognised role must not fall through to the employee app: that is
    // how an admin once ended up in the wrong UI. A role this build doesn't
    // know about means the account is newer than the installed app, so say so
    // and offer a way out rather than guessing.
    return (
      <SessionRecoveryScreen
        message={
          "This account uses a role this version of the app doesn't support yet. " +
          "Update StaffTrack, or log in with a different account."
        }
        onRetry={retrySession}
        onLogout={logout}
      />
    );
  };

  return <NavigationContainer>{renderApp()}</NavigationContainer>;
}

const styles = StyleSheet.create({
  startup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#112250",
  },

  recovery: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },

  logoutBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textDecorationLine: "underline",
  },
});
