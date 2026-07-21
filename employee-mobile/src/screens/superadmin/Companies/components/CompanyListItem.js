import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATUS_STYLE = {
  active: { bg: "#DCFCE7", text: "#16A34A", label: "Active" },
  trial: { bg: "#FEF3C7", text: "#D97706", label: "Trial" },
  suspended: { bg: "#FEE2E2", text: "#EF4444", label: "Suspended" },
  expired: { bg: "#F3F4F6", text: "#6B7280", label: "Expired" },
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function CompanyListItem({ company, onPress }) {
  const status = STATUS_STYLE[company.subscription?.status] || STATUS_STYLE.trial;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(company)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(company.name)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{company.name}</Text>
        <Text style={styles.email}>{company.email}</Text>
        <Text style={styles.meta}>{company.subscription?.plan || "Premium"} plan</Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
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
    color: "#112250",
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

  right: {
    alignItems: "flex-end",
  },

  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
