import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useActiveSite } from "../context/SiteContext";

/**
 * The current-site bar that sits under the title on every labour screen, with
 * a Change action.
 *
 * Replaces SiteChipSelector, which was a bare horizontal ScrollView. React
 * Native gives every ScrollView flexGrow: 1 (Libraries/Components/ScrollView/
 * ScrollView.js -> baseHorizontal), so inside a column layout it stretched
 * VERTICALLY and split the leftover space with the list below it -- the tall
 * blank band on the attendance screen. This is a fixed-height View, so that
 * cannot happen.
 */
export default function SiteHeader({ onSiteChange, right }) {
  const { sites, activeSite, activeSiteId, changeSite } = useActiveSite();
  const [pickerOpen, setPickerOpen] = useState(false);

  const pick = async (siteId) => {
    setPickerOpen(false);
    if (String(siteId) === String(activeSiteId)) return;

    await changeSite(siteId);
    // Screens reload their own data on the new site; the context only owns
    // which site is current.
    if (onSiteChange) onSiteChange(siteId);
  };

  if (!activeSite) {
    return (
      <View style={styles.bar}>
        <Ionicons name="business-outline" size={16} color="#9CA3AF" />
        <Text style={styles.noSite} numberOfLines={1}>No site selected</Text>
        {right}
      </View>
    );
  }

  const canSwitch = sites.length > 1;

  return (
    <>
      <View style={styles.bar}>
        {/* The whole site block is the switch target rather than a separate
            "Change Site" label -- that buys back the width the `right` slot
            needs, and a chevron already reads as tappable. */}
        <TouchableOpacity
          style={styles.siteBlock}
          onPress={() => canSwitch && setPickerOpen(true)}
          disabled={!canSwitch}
          activeOpacity={0.6}
        >
          <Ionicons name="business" size={15} color="#112250" />
          <Text style={styles.name} numberOfLines={1}>{activeSite.name}</Text>
          <Text style={styles.code}>{activeSite.code}</Text>
          {canSwitch && <Ionicons name="chevron-down" size={13} color="#112250" />}
        </TouchableOpacity>

        {/* Optional slot so a screen can put its own control (the date
            stepper, say) on this same bar instead of costing another row. */}
        {right}
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Change Site</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={sites}
              keyExtractor={(item) => String(item._id)}
              renderItem={({ item }) => {
                const current = String(item._id) === String(activeSiteId);
                const inactive = item.status === "inactive";

                return (
                  <TouchableOpacity
                    style={[styles.row, current && styles.rowCurrent]}
                    onPress={() => pick(item._id)}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                        {inactive ? "  (inactive)" : ""}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.code}
                        {item.location ? ` · ${item.location}` : ""}
                      </Text>
                    </View>

                    {current && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Fixed height, deliberately: this is what stops the site selector eating
  // vertical space the labour list needs.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#EEECFF",
  },

  siteBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },

  name: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#112250",
  },

  code: {
    fontSize: 11,
    color: "#6B7280",
  },

  noSite: {
    flex: 1,
    fontSize: 13,
    color: "#9CA3AF",
  },

  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#112250",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },

  rowCurrent: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  rowInfo: {
    flex: 1,
  },

  rowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  rowMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});
