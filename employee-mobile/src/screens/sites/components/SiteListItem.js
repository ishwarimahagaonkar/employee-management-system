import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SiteListItem({ site, canReassign, onEdit, onReassign }) {
  const isInactive = site.status === "inactive";

  // The API populates supervisorId, so it arrives as an object; it stays null
  // when a site sits between supervisors.
  const supervisor = site.supervisorId;

  return (
    <View style={[styles.card, isInactive && styles.cardInactive]}>
      <View style={styles.codeBadge}>
        <Text style={styles.codeText}>{site.code}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isInactive && styles.nameInactive]} numberOfLines={1}>
            {site.name}
          </Text>
          {isInactive && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Inactive</Text>
            </View>
          )}
        </View>

        <Text style={styles.location} numberOfLines={1}>
          {site.location}
        </Text>

        <Text style={[styles.supervisor, !supervisor && styles.unassigned]}>
          {supervisor ? supervisor.fullName : "No supervisor assigned"}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(site)}>
          <Ionicons name="create-outline" size={18} color="#112250" />
        </TouchableOpacity>

        {canReassign && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onReassign(site)}>
            <Ionicons name="person-outline" size={18} color="#1D4ED8" />
          </TouchableOpacity>
        )}
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

  codeBadge: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  codeText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 12,
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

  location: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },

  supervisor: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  unassigned: {
    color: "#D97706",
    fontStyle: "italic",
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
