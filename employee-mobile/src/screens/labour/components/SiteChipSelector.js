import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";

// Horizontal site picker. Labour always belongs to exactly one site, so every
// labour screen needs a way to say which site is being looked at.
export default function SiteChipSelector({ sites, selectedId, onSelect }) {
  if (sites.length === 0) return null;

  // With one site there's nothing to choose -- show it as a plain caption
  // instead of a tappable chip that does nothing.
  if (sites.length === 1) {
    return (
      <View style={styles.singleWrap}>
        <Text style={styles.singleText}>
          {sites[0].name} ({sites[0].code})
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {sites.map((site) => {
        const selected = String(site._id) === String(selectedId);

        return (
          <TouchableOpacity
            key={site._id}
            style={[styles.chip, selected && styles.chipActive]}
            onPress={() => onSelect(site._id)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>
              {site.code}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },

  chipActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  chipTextActive: {
    color: "#112250",
  },

  singleWrap: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },

  singleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
});
