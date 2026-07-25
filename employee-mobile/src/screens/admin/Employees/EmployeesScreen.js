import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import EmployeeListItem from "./components/EmployeeListItem";
import EmployeeFormModal from "./components/EmployeeFormModal";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

export default function EmployeesScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchEmployees = async () => {
    try {
      setError(null);
      const res = await api.get("/employees");
      setEmployees(res.data.employees || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchEmployees();
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openAdd = () => {
    setEditingEmployee(null);
    setModalVisible(true);
  };

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setModalVisible(true);
  };

  const handleSubmit = async (form) => {
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee._id}`, {
          empID: form.empID,
          fullName: form.fullName,
          department: form.department,
          designation: form.designation,
          hourlyRate: form.hourlyRate === "" ? undefined : Number(form.hourlyRate),
          JoiningDate: form.JoiningDate,
        });

        // Optional password reset on edit (only when a new password was entered).
        if (form.password && form.password.trim()) {
          await api.patch(`/employees/${editingEmployee._id}/password`, {
            password: form.password,
          });
        }
      } else {
        if (!form.empID || !form.fullName || !form.email || !form.password || !form.department || !form.designation || !form.JoiningDate) {
          Alert.alert("Error", "All fields are required");
          return;
        }
        await api.post("/employees", form);
      }

      setModalVisible(false);
      fetchEmployees();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save employee");
    }
  };

  const removeEmployee = async (employee) => {
    try {
      await api.delete(`/employees/${employee._id}`);
      fetchEmployees();
    } catch (err) {
      Alert.alert("Error", "Failed to delete employee");
    }
  };

  // Spells out that deleting also erases history, and points at the
  // reversible alternative -- deleting is permanent and unrecoverable.
  const deleteWarning = (employee) =>
    `Permanently delete ${employee.fullName}?\n\n` +
    `This also erases all of their attendance records, trips and leave requests. ` +
    `Past reports that included them will change, and this cannot be undone.\n\n` +
    `To just stop their access instead, use Deactivate — their records are kept.`;

  const handleDelete = (employee) => {
    // Alert.alert's multi-button confirm doesn't work on react-native-web,
    // so fall back to window.confirm there.
    if (Platform.OS === "web") {
      if (window.confirm(deleteWarning(employee))) {
        removeEmployee(employee);
      }
      return;
    }

    Alert.alert("Delete Employee", deleteWarning(employee), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Permanently", style: "destructive", onPress: () => removeEmployee(employee) },
    ]);
  };

  const setActive = async (employee, isActive) => {
    try {
      setTogglingId(employee._id);
      await api.put(`/employees/${employee._id}`, { isActive });
      await fetchEmployees();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleActive = (employee) => {
    const isInactive = employee.isActive === false;

    const title = isInactive ? "Reactivate Employee" : "Deactivate Employee";
    const message = isInactive
      ? `Let ${employee.fullName} log in again?`
      : `Stop ${employee.fullName} from logging in?\n\n` +
        `They'll be signed out immediately and won't appear as a co-traveler option. ` +
        `All their records are kept, and you can reactivate them any time.`;

    if (Platform.OS === "web") {
      if (window.confirm(message)) setActive(employee, isInactive);
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: isInactive ? "Reactivate" : "Deactivate",
        onPress: () => setActive(employee, isInactive),
      },
    ]);
  };

  const filtered = employees.filter((e) =>
    [e.fullName, e.email, e.department, e.designation]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No employees found</Text>}
          renderItem={({ item }) => (
            <EmployeeListItem
              employee={item}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              busy={togglingId === item._id}
            />
          )}
        />
      )}

      <EmployeeFormModal
        visible={modalVisible}
        employee={editingEmployee}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
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

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#112250",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E1B4B",
  },

  loader: {
    marginTop: 40,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
  },
});
