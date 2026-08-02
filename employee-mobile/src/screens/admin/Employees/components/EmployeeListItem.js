import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// The list now covers every role a caller can manage, not just employees, so
// each row has to say which one it is. Plain "Employee" stays unlabelled --
// it's the default and badging every row would just add noise.
const ROLE_BADGES = {
  admin: { label: "Admin", background: "#EEECFF", color: "#112250" },
  manager: { label: "Manager", background: "#DCFCE7", color: "#15803D" },
  supervisor: { label: "Supervisor", background: "#DBEAFE", color: "#1D4ED8" },
};

export default function EmployeeListItem({ employee, onEdit, onDelete, onToggleActive, busy }) {
  // Only an explicit false means deactivated; older records have no flag.
  const isInactive = employee.isActive === false;
  const roleBadge = ROLE_BADGES[employee.role];

  return (
    <View style={[styles.card, isInactive && styles.cardInactive]}>
      <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
        <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isInactive && styles.nameInactive]}>{employee.fullName}</Text>
          {!!roleBadge && (
            <View style={[styles.badge, { backgroundColor: roleBadge.background }]}>
              <Text style={[styles.badgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
            </View>
          )}
          {isInactive && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <Text style={styles.email}>{employee.email}</Text>
        <Text style={styles.meta}>
          {[employee.department, employee.designation].filter(Boolean).join(" • ")}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(employee)}>
          <Ionicons name="create-outline" size={18} color="#112250" />
        </TouchableOpacity>

        {/* Deactivate is the safe alternative to deleting: it blocks their
            login and hides them from pickers, but keeps their records. */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onToggleActive(employee)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#112250" />
          ) : (
            <Ionicons
              name={isInactive ? "person-add-outline" : "person-remove-outline"}
              size={18}
              color={isInactive ? "#16A34A" : "#D97706"}
            />
          )}
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

  cardInactive: {
    backgroundColor: "#F8FAFC",
    opacity: 0.85,
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

  avatarInactive: {
    backgroundColor: "#E5E7EB",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  nameInactive: {
    color: "#6B7280",
  },

  badge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
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

  actions: {
    flexDirection: "row",
  },

  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
