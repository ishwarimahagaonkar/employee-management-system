import React, { useState } from "react";
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

const emptyForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  admin: {
    empID: "",
    fullName: "",
    email: "",
    password: "",
  },
};

export default function CompanyFormModal({ visible, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAdmin = (key) => (value) =>
    setForm((prev) => ({ ...prev, admin: { ...prev.admin, [key]: value } }));

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(form, () => setForm(emptyForm));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Company</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Company Details</Text>

            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={update("name")}
              placeholder="Acme Inc."
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Contact Person</Text>
            <TextInput
              style={styles.input}
              value={form.contactPerson}
              onChangeText={update("contactPerson")}
              placeholder="Jane Doe"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Company Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={update("email")}
              placeholder="contact@acme.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={update("phone")}
              placeholder="+91 98765 43210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={form.address}
              onChangeText={update("address")}
              placeholder="Company address"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.sectionLabel}>First Admin Account</Text>

            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              value={form.admin.empID}
              onChangeText={updateAdmin("empID")}
              placeholder="ADM001"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.admin.fullName}
              onChangeText={updateAdmin("fullName")}
              placeholder="Admin's full name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Admin Email</Text>
            <TextInput
              style={styles.input}
              value={form.admin.email}
              onChangeText={updateAdmin("email")}
              placeholder="admin@acme.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.admin.password}
              onChangeText={updateAdmin("password")}
              placeholder="Temporary password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>Create Company</Text>
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
    maxHeight: "88%",
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

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#112250",
    marginBottom: 10,
    marginTop: 4,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
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
