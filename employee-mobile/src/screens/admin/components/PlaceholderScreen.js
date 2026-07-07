import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PlaceholderScreen({ route }) {
  const { title = "Coming Soon", icon = "construct-outline" } = route?.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={28} color="#6D5DF6" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>This section is coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
  },
});
