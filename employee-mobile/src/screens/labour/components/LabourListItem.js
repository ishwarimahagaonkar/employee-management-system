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

export default function LabourListItem({ labour, canEdit, onEdit }) {
  const isInactive = labour.status === "inactive";

  return (
    <View style={[styles.card, isInactive && styles.cardInactive]}>
      <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
        <Text style={styles.avatarText}>{initials(labour.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isInactive && styles.nameInactive]} numberOfLines={1}>
            {labour.fullName}
          </Text>
          {isInactive && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Inactive</Text>
            </View>
          )}
        </View>

        <Text style={styles.labourId}>{labour.labourId}</Text>

        {/* Most labourers have no phone on file, so say so rather than
            leaving a blank line that looks like a rendering fault. */}
        <Text style={[styles.mobile, !labour.mobile && styles.noMobile]}>
          {labour.mobile || "No mobile number"}
        </Text>
      </View>

      {canEdit && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(labour)}>
          <Ionicons name="create-outline" size={18} color="#112250" />
        </TouchableOpacity>
      )}
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

  avatarText: {
    color: "#112250",
    fontWeight: "700",
  },

  info: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
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

  labourId: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },

  mobile: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  noMobile: {
    fontStyle: "italic",
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
