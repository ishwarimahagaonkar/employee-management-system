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

const emptyForm = {
  empID: "",
  fullName: "",
  email: "",
  password: "",
  department: "",
  designation: "",
  JoiningDate: "",
  role: "employee",
};

export default function EmployeeFormModal({ visible, employee, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!employee;

  useEffect(() => {
    if (employee) {
      setForm({
        empID: employee.empID || "",
        fullName: employee.fullName || "",
        email: employee.email || "",
        password: "",
        department: employee.department || "",
        designation: employee.designation || "",
        JoiningDate: employee.JoiningDate || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [employee, visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? "Edit Employee" : "Add Employee"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              value={form.empID}
              onChangeText={update("empID")}
              placeholder="EMP001"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={update("fullName")}
              placeholder="Jane Doe"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={update("email")}
              placeholder="jane@company.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isEdit}
            />

            {!isEdit && (
              <>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={update("password")}
                  placeholder="Temporary password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />

                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, form.role === "employee" && styles.roleBtnActive]}
                    onPress={() => update("role")("employee")}
                  >
                    <Text style={[styles.roleBtnText, form.role === "employee" && styles.roleBtnTextActive]}>
                      Employee
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, form.role === "admin" && styles.roleBtnActive]}
                    onPress={() => update("role")("admin")}
                  >
                    <Text style={[styles.roleBtnText, form.role === "admin" && styles.roleBtnTextActive]}>
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              value={form.department}
              onChangeText={update("department")}
              placeholder="Engineering"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              value={form.designation}
              onChangeText={update("designation")}
              placeholder="Software Engineer"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.label}>Joining Date</Text>
            <TextInput
              style={styles.input}
              value={form.JoiningDate}
              onChangeText={update("JoiningDate")}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={() => onSubmit(form)}>
              <Text style={styles.submitText}>{isEdit ? "Save Changes" : "Create Employee"}</Text>
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

  roleRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 10,
  },

  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  roleBtnActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  roleBtnTextActive: {
    color: "#112250",
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
