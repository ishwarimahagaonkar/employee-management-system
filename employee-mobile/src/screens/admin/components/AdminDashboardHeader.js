import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function AdminDashboardHeader({
  name,
  onMenuPress,
  attendanceRate,
  showProgress,
  onRefresh,
  refreshing,
}) {
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get("/settings")
      .then((res) => {
        if (mounted) setCompanyName(res.data?.data?.companyName || "");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LinearGradient colors={["#112250", "#1a3a8c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../../../assets/logo-white.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>StaffTrack</Text>
        {!!companyName && (
          <>
            <Text style={styles.brandDot}> · </Text>
            <Text style={styles.brandCompany}>{companyName}</Text>
          </>
        )}
      </View>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <Ionicons name="menu" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenLabel}>Dashboard</Text>
        <View style={styles.topBarRight}>
          {!!onRefresh && (
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshBtn}
              disabled={refreshing}
              accessibilityLabel="Refresh dashboard"
            >
              <Ionicons
                name="refresh"
                size={18}
                color={refreshing ? "rgba(255,255,255,0.5)" : "#fff"}
              />
            </TouchableOpacity>
          )}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.greeting}>{getGreeting()}</Text>
      <Text style={styles.name}>{name}</Text>

      {showProgress && (
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Today's Attendance</Text>
          <Text style={styles.progressValue}>{attendanceRate}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${attendanceRate}%` }]} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  brandLogo: {
    width: 16,
    height: 16,
    marginRight: 6,
  },

  brandText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  brandDot: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },

  brandCompany: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "500",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  screenLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },

  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  greeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },

  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 20,
  },

  progressCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    padding: 16,
  },

  progressLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },

  progressValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 10,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
