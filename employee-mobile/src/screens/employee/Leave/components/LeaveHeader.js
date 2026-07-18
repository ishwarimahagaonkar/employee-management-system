import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LeaveCard from "./LeaveCard";
import PrimaryButton from "./PrimaryButton";

export default function LeaveHeader({ balances, onApplyPress }) {
  return (
    <LinearGradient
      colors={["#112250", "#112250"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <Text style={styles.title}>Leave Management</Text>

      <View style={styles.row}>
        <LeaveCard count={balances.Paid} label="Paid" />
        <LeaveCard count={balances.Unpaid} label="Unpaid" />
      </View>

      <PrimaryButton label="Apply for Leave" variant="white" onPress={onApplyPress} style={styles.applyBtn} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
  },

  row: {
    flexDirection: "row",
    marginHorizontal: -5,
    marginBottom: 20,
  },

  applyBtn: {
    marginTop: 0,
  },
});
