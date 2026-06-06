import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      {/* Profile Image */}
      <Image
        source={{
          uri: "https://ui-avatars.com/api/?name=Employee",
        }}
        style={styles.avatar}
      />

      {/* User Info */}
      <Text style={styles.name}>John Doe</Text>
      <Text style={styles.email}>john@example.com</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Employee ID</Text>
        <Text style={styles.value}>EMP001</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Department</Text>
        <Text style={styles.value}>Engineering</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Designation</Text>
        <Text style={styles.value}>Software Engineer</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    paddingTop: 50,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },

  name: {
    fontSize: 24,
    fontWeight: "bold",
  },

  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },

  card: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },

  label: {
    color: "#777",
    fontSize: 14,
  },

  value: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },

  logoutBtn: {
    marginTop: 30,
    backgroundColor: "#EF4444",
    width: "90%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});