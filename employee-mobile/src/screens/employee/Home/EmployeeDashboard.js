import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function EmployeeDashboard({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Good Morning 👋
          </Text>

          <Text style={styles.name}>
            Ishwari
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>
            Today's Status
          </Text>

          <Text style={styles.present}>
            Present
          </Text>

          <Text style={styles.info}>
            Punch In : 09:05 AM
          </Text>

          <Text style={styles.info}>
            Working Hours : 3h 25m
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>
              Punch In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>
              Punch Out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate("AttendanceScreen")
            }
          >
            <Text style={styles.secondaryText}>
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate("Profile")
            }
          >
            <Text style={styles.secondaryText}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    padding: 20,
  },

  greeting: {
    fontSize: 18,
    color: "#64748B",
  },

  name: {
    fontSize: 30,
    fontWeight: "700",
    marginTop: 5,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 16,
    color: "#64748B",
  },

  present: {
    fontSize: 24,
    fontWeight: "700",
    color: "#22C55E",
    marginVertical: 10,
  },

  info: {
    fontSize: 15,
    color: "#334155",
    marginTop: 5,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },

  actionButton: {
    width: "48%",
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  secondaryButton: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    elevation: 2,
  },

  secondaryText: {
    fontWeight: "600",
    color: "#334155",
  },
});