import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function EmployeeListItem({ employee, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{employee.fullName}</Text>
        <Text style={styles.email}>{employee.email}</Text>
        <Text style={styles.meta}>
          {[employee.department, employee.designation].filter(Boolean).join(" • ")}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(employee)}>
          <Ionicons name="create-outline" size={18} color="#6D5DF6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(employee)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#6D5DF6",
    fontWeight: "700",
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  email: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },

  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
  },

  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
