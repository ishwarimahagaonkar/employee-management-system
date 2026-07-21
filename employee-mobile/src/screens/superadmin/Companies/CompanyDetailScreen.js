import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import SubscriptionEditModal from "./components/SubscriptionEditModal";

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

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

export default function CompanyDetailScreen({ route, navigation }) {
  const { companyId } = route.params || {};
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "" });
  const [subModalVisible, setSubModalVisible] = useState(false);

  const fetchCompany = async () => {
    try {
      const res = await api.get(`/companies/${companyId}`);
      setCompany(res.data);
      setForm({
        name: res.data.name || "",
        contactPerson: res.data.contactPerson || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
    } catch (err) {
      Alert.alert("Error", "Failed to load company");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveProfile = async () => {
    try {
      await api.put(`/companies/${companyId}`, form);
      setEditing(false);
      fetchCompany();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update company");
    }
  };

  const saveSubscription = async (payload) => {
    try {
      await api.put(`/companies/${companyId}/subscription`, payload);
      setSubModalVisible(false);
      fetchCompany();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update subscription");
    }
  };

  const deleteCompany = async () => {
    try {
      await api.delete(`/companies/${companyId}`);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to delete company");
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete ${company?.name}? This cannot be undone.`)) {
        deleteCompany();
      }
      return;
    }

    Alert.alert(
      "Delete Company",
      `Delete ${company?.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteCompany },
      ]
    );
  };

  if (loading || !company) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const status = STATUS_STYLE[company.subscription?.status] || STATUS_STYLE.trial;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Details</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(company.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{company.name}</Text>
            <Text style={styles.meta}>{company.contactPerson}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Company Info</Text>
            <TouchableOpacity onPress={() => (editing ? saveProfile() : setEditing(true))}>
              <Text style={styles.editLink}>{editing ? "Save" : "Edit"}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <>
              <TextInput style={styles.input} value={form.name} onChangeText={update("name")} placeholder="Company name" placeholderTextColor="#9CA3AF" />
              <TextInput style={styles.input} value={form.contactPerson} onChangeText={update("contactPerson")} placeholder="Contact person" placeholderTextColor="#9CA3AF" />
              <TextInput style={styles.input} value={form.email} onChangeText={update("email")} placeholder="Email" placeholderTextColor="#9CA3AF" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={form.phone} onChangeText={update("phone")} placeholder="Phone" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={form.address} onChangeText={update("address")} placeholder="Address" placeholderTextColor="#9CA3AF" />
            </>
          ) : (
            <>
              <DetailRow label="Contact Person" value={company.contactPerson} />
              <DetailRow label="Email" value={company.email} />
              <DetailRow label="Phone" value={company.phone} />
              <DetailRow label="Address" value={company.address} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <TouchableOpacity onPress={() => setSubModalVisible(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <DetailRow label="Plan" value={company.subscription?.plan} />
          <DetailRow label="Status" value={status.label} />
          <DetailRow label="Start Date" value={formatDate(company.subscription?.startDate)} />
          <DetailRow label="End Date" value={formatDate(company.subscription?.endDate)} />
          <DetailRow label="Employee Limit" value={company.subscription?.employeeLimit} />
        </View>
      </ScrollView>

      <SubscriptionEditModal
        visible={subModalVisible}
        subscription={company.subscription}
        onClose={() => setSubModalVisible(false)}
        onSubmit={saveSubscription}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  loader: {
    marginTop: 60,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 18,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  editLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#112250",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
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
    marginBottom: 12,
  },
});
