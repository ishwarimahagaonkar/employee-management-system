import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "react-native";
import api from "../../../../api/api.js";

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

export default function DashboardHeader({ name, checkedIn }) {
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
    <LinearGradient
      colors={["#112250", "#1a3a8c"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.brandRow}>
        <Image
          source={require("../../../../../assets/logo-white.png")}
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

      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={styles.statusValue}>{checkedIn ? "Checked In" : "Checked Out"}</Text>
        </View>

        <View style={styles.clockBadge}>
          <Ionicons name="time-outline" size={20} color="#fff" />
        </View>
      </View>

  
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

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  greeting: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },

  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 2,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    padding: 18,
  },

  statusLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },

  statusValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },

  clockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
