import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PLANS = ["Standard", "Premium"];
const STATUSES = ["trial", "active", "suspended", "expired"];

const toDateInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function SubscriptionEditModal({ visible, subscription, onClose, onSubmit }) {
  const [form, setForm] = useState({
    plan: "Premium",
    status: "trial",
    startDate: "",
    endDate: "",
    employeeLimit: "10",
  });

  useEffect(() => {
    if (subscription) {
      setForm({
        plan: subscription.plan || "Premium",
        status: subscription.status || "trial",
        startDate: toDateInput(subscription.startDate),
        endDate: toDateInput(subscription.endDate),
        employeeLimit: String(subscription.employeeLimit ?? "10"),
      });
    }
  }, [subscription, visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    onSubmit({
      plan: form.plan,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      employeeLimit: form.employeeLimit ? Number(form.employeeLimit) : undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Plan</Text>
            <View style={styles.optionRow}>
              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[styles.optionBtn, form.plan === plan && styles.optionBtnActive]}
                  onPress={() => update("plan")(plan)}
                >
                  <Text style={[styles.optionText, form.plan === plan && styles.optionTextActive]}>
                    {plan}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.optionRow}>
              {STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.optionBtn, form.status === status && styles.optionBtnActive]}
                  onPress={() => update("status")(status)}
                >
                  <Text style={[styles.optionText, form.status === status && styles.optionTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={form.startDate}
              onChangeText={update("startDate")}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={form.endDate}
              onChangeText={update("endDate")}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Employee Limit</Text>
            <TextInput
              style={styles.input}
              value={form.employeeLimit}
              onChangeText={update("employeeLimit")}
              placeholder="10"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>Save Subscription</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },

  optionBtnActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  optionTextActive: {
    color: "#112250",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
    marginBottom: 16,
  },

  submitBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
