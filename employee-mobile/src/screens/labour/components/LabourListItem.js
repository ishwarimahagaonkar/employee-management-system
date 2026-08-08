import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Fixed so the master list can use getItemLayout.
export const LABOUR_ROW_HEIGHT = 56;

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function LabourListItem({ labour, canEdit, onEdit }) {
  const isInactive = labour.status === "inactive";

  return (
    <View style={[styles.row, isInactive && styles.rowInactive]}>
      <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
        <Text style={styles.avatarText}>{initials(labour.fullName)}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isInactive && styles.nameInactive]} numberOfLines={1}>
            {labour.fullName}
          </Text>
          {isInactive && <Text style={styles.inactiveTag}>inactive</Text>}
        </View>

        {/* ID and mobile share one line -- two stacked lines was most of the
            wasted height in the old card. */}
        <Text style={styles.meta} numberOfLines={1}>
          {labour.labourId}
          {labour.mobile ? ` · ${labour.mobile}` : " · no mobile"}
        </Text>
      </View>

      {canEdit && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit(labour)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={17} color="#112250" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(LabourListItem, (prev, next) =>
  prev.labour._id === next.labour._id &&
  prev.labour.fullName === next.labour.fullName &&
  prev.labour.labourId === next.labour.labourId &&
  prev.labour.mobile === next.labour.mobile &&
  prev.labour.status === next.labour.status &&
  prev.canEdit === next.canEdit &&
  prev.onEdit === next.onEdit
);

const styles = StyleSheet.create({
  row: {
    height: LABOUR_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EEF1F5",
  },

  rowInactive: {
    backgroundColor: "#F8FAFC",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInactive: {
    backgroundColor: "#E5E7EB",
  },

  avatarText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 12,
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  name: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  nameInactive: {
    color: "#6B7280",
  },

  inactiveTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
  },

  meta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },

  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});
