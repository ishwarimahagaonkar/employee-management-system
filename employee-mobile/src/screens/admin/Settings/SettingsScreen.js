import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import SettingsCard from "./components/SettingsCard";
import SettingsField from "./components/SettingsField";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

const emptyForm = {
  companyName: "",
  industry: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  officeLat: "",
  officeLng: "",
  geofenceRadius: "",
  enforceGps: true,
  workStartTime: "",
  workEndTime: "",
  halfDayHours: "",
  paidLeaveAllotment: "",
};

const formFromSettings = (s = {}) => ({
  companyName: s.companyName || "",
  industry: s.industry || "",
  companyEmail: s.companyEmail || "",
  companyPhone: s.companyPhone || "",
  companyAddress: s.companyAddress || "",
  officeLat: String(s.officeLat ?? ""),
  officeLng: String(s.officeLng ?? ""),
  geofenceRadius: String(s.geofenceRadius ?? ""),
  enforceGps: !!s.enforceGps,
  workStartTime: s.workStartTime || "",
  workEndTime: s.workEndTime || "",
  halfDayHours: String(s.halfDayHours ?? ""),
  paidLeaveAllotment: String(s.paidLeaveAllotment ?? ""),
});

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      setError(null);
      const res = await api.get("/settings");
      const next = formFromSettings(res.data?.data);
      setForm(next);
      setSavedForm(next);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setForm(savedForm);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put("/settings", {
        companyName: form.companyName,
        industry: form.industry,
        companyEmail: form.companyEmail,
        companyPhone: form.companyPhone,
        companyAddress: form.companyAddress,
        officeLat: parseFloat(form.officeLat) || 0,
        officeLng: parseFloat(form.officeLng) || 0,
        geofenceRadius: parseFloat(form.geofenceRadius) || 0,
        enforceGps: form.enforceGps,
        workStartTime: form.workStartTime,
        workEndTime: form.workEndTime,
        halfDayHours: parseFloat(form.halfDayHours) || 0,
        paidLeaveAllotment: parseInt(form.paidLeaveAllotment, 10) || 0,
      });
      const next = formFromSettings(res.data?.data);
      setForm(next);
      setSavedForm(next);
      setIsEditing(false);
      Alert.alert("Success", "Settings saved successfully");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleGps = () => {
    if (!isEditing) return;
    setForm((prev) => ({ ...prev, enforceGps: !prev.enforceGps }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Ionicons name="menu" size={24} color="#1E1B4B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {!isEditing && (
            <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
              <Ionicons name="pencil" size={16} color="#112250" style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Configure your organization settings</Text>

        <SettingsCard
          icon="document-text-outline"
          iconColor="#112250"
          iconBg="#EEECFF"
          title="Company Profile"
          subtitle="Update your organization details"
        >
          <View style={styles.row}>
            <SettingsField
              half
              editable={isEditing}
              label="Company Name"
              value={form.companyName}
              onChangeText={update("companyName")}
            />
            <SettingsField
              half
              editable={isEditing}
              label="Industry"
              value={form.industry}
              onChangeText={update("industry")}
            />
          </View>
          <View style={styles.row}>
            <SettingsField
              half
              editable={isEditing}
              label="Email"
              value={form.companyEmail}
              onChangeText={update("companyEmail")}
              keyboardType="email-address"
            />
            <SettingsField
              half
              editable={isEditing}
              label="Phone"
              value={form.companyPhone}
              onChangeText={update("companyPhone")}
              keyboardType="phone-pad"
            />
          </View>
          <SettingsField
            editable={isEditing}
            label="Address"
            value={form.companyAddress}
            onChangeText={update("companyAddress")}
          />
        </SettingsCard>

        <SettingsCard
          icon="location-outline"
          iconColor="#112250"
          iconBg="#EDE9FE"
          title="Office Geofence Settings"
          subtitle="Configure location-based attendance"
        >
          <View style={styles.row}>
            <SettingsField
              half
              editable={isEditing}
              label="Office Latitude"
              value={form.officeLat}
              onChangeText={update("officeLat")}
              keyboardType="numeric"
            />
            <SettingsField
              half
              editable={isEditing}
              label="Office Longitude"
              value={form.officeLng}
              onChangeText={update("officeLng")}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.row}>
            <SettingsField
              half
              editable={isEditing}
              label="Geofence Radius (meters)"
              value={form.geofenceRadius}
              onChangeText={update("geofenceRadius")}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.checkboxRow, !isEditing && styles.checkboxRowDisabled]}
              onPress={toggleGps}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <View style={[styles.checkbox, form.enforceGps && styles.checkboxChecked]}>
                {form.enforceGps && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Enforce GPS verification</Text>
            </TouchableOpacity>
          </View>
        </SettingsCard>

        <SettingsCard
          icon="time-outline"
          iconColor="#0891B2"
          iconBg="#CFFAFE"
          title="Attendance Rules"
          subtitle="Configure attendance policies"
        >
          <View style={styles.row}>
            <SettingsField
              half
              editable={isEditing}
              label="Work Start Time"
              value={form.workStartTime}
              onChangeText={update("workStartTime")}
              placeholder="09:00"
            />
            <SettingsField
              half
              editable={isEditing}
              label="Work End Time"
              value={form.workEndTime}
              onChangeText={update("workEndTime")}
              placeholder="18:00"
            />
          </View>
          <SettingsField
            editable={isEditing}
            label="Half Day Hours"
            value={form.halfDayHours}
            onChangeText={update("halfDayHours")}
            keyboardType="numeric"
          />
        </SettingsCard>

        <SettingsCard
          icon="calendar-outline"
          iconColor="#16A34A"
          iconBg="#DCFCE7"
          title="Leave Rules"
          subtitle="Configure leave policies"
        >
          <SettingsField
            editable={isEditing}
            label="Paid Leaves Per Year"
            value={form.paidLeaveAllotment}
            onChangeText={update("paidLeaveAllotment")}
            keyboardType="numeric"
          />
        </SettingsCard>

        {isEditing && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  loader: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E1B4B",
    marginLeft: 14,
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEECFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },

  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#112250",
  },

  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 20,
    marginLeft: 38,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  checkboxRow: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
  },

  checkboxRowDisabled: {
    opacity: 0.6,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: "#112250",
    borderColor: "#112250",
  },

  checkboxLabel: {
    fontSize: 13,
    color: "#374151",
    flexShrink: 1,
  },

  actionsRow: {
    flexDirection: "row",
    marginTop: 4,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#F1F1F5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: 10,
  },

  cancelText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
