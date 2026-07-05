import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api"
import { AuthContext } from "../../context/AuthContext";

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={20} color="#6D5DF6" />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "-"}</Text>
    </View>
  </View>
);

export default function ProfileScreen({navigation}) {
  const {logout, user} = useContext(AuthContext);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/employees/me");
      setProfile(res.data);
    } catch (error) {
      console.log("Fetch profile error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");

      await logout();

    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6D5DF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6D5DF6", "#8B7DFB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile?.fullName)}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.designation}>{profile?.designation}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Personal Information
        </Text>
        <InfoRow icon="person-outline" label="Employee ID" value={profile?._id} />
        <InfoRow icon="mail-outline" label="Email" value={profile?.email} />
        <InfoRow icon="business-outline" label="Department" value={profile?.department} />
        <InfoRow icon="calendar-outline" label="Joining Date" value={formatDate(profile?.createdAt)} />     
      </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#f23b3b" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 90,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },

  headerTitle: {
    alignSelf: "flex-start",
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
    marginTop: -45,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  designation: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 0,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 16,
  },

  cardTitleAccent: {
    color: "#F59E0B",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  rowText: {
    flex: 1,
  },

  rowLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: "row",
    marginTop: 24,
    backgroundColor: "#ff00001f",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#f23b3b",
    fontWeight: "bold",
    fontSize: 16,
  },
});
