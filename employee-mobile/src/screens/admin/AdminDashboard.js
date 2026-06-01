import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function AdminDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.welcome}>Welcome Admin 👋</Text>
        <Text style={styles.subtitle}>
          Employee Management Dashboard
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Employees</Text>
            <Text style={styles.cardValue}>25</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Present</Text>
            <Text style={styles.cardValue}>20</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Absent</Text>
            <Text style={styles.cardValue}>5</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Late</Text>
            <Text style={styles.cardValue}>2</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>
            👥 Manage Employees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>
            📅 Attendance Records
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>
            💰 Salary Management
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>
            📄 Generate Reports
          </Text>
        </TouchableOpacity>

        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>
            Today's Summary
          </Text>

          <Text style={styles.todayText}>
            Total Working Employees: 20
          </Text>

          <Text style={styles.todayText}>
            Employees Yet to Punch In: 3
          </Text>

          <Text style={styles.todayText}>
            Employees Outside Office: 1
          </Text>
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

  welcome: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 20,
    marginHorizontal: 20,
  },

  subtitle: {
    color: "#64748B",
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },

  cardTitle: {
    color: "#64748B",
    fontSize: 14,
  },

  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
    color: "#2563EB",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },

  actionButton: {
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 12,
  },

  actionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  todayCard: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },

  todayTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },

  todayText: {
    marginBottom: 8,
    color: "#334155",
  },
});