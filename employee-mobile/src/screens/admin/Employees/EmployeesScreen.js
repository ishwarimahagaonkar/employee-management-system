import React, { useContext, useEffect, useState } from "react";
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
import { AuthContext } from "../../../context/AuthContext";

// Mirrors assignableRolesFor() in the API's config/roles.js. The server is
// still the authority -- this only decides which buttons are worth showing.
const ASSIGNABLE_ROLES = {
  admin: ["admin", "manager", "supervisor", "employee"],
  manager: ["supervisor", "employee"],
};

export default function EmployeesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
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

  // Returns an error message for the form to display, or null once saved. The
  // modal owns the field validation and shows failures inline -- Alert.alert
  // can't be used while the form is open, since on Android the dialog may sit
  // behind the modal and leave a dimmed sheet that swallows every tap.
  const handleSubmit = async (form) => {
    // Held until the modal has closed -- see where it is shown below.
    let confirmation = null;

    try {
      if (editingEmployee) {
        // Three separate requests, because the role and the password each have
        // their own guarded endpoint -- a profile save must not be able to
        // smuggle in a promotion or a credential change.
        //
        // They are reported on individually. Previously any failure surfaced as
        // one generic message with no indication of WHICH part failed, so a
        // password reset that was rejected looked identical to one that
        // silently did nothing -- and on success nothing said the password had
        // changed at all.
        const changedPassword = !!(form.password && form.password.trim());

        try {
          await api.put(`/employees/${editingEmployee._id}`, {
            empID: form.empID,
            fullName: form.fullName,
            department: form.department,
            designation: form.designation,
            hourlyRate: form.hourlyRate === "" ? undefined : Number(form.hourlyRate),
            JoiningDate: form.JoiningDate,
          });
        } catch (err) {
          return `Profile not saved: ${getApiErrorMessage(err)}`;
        }

        if (form.role && form.role !== editingEmployee.role) {
          try {
            await api.patch(`/employees/${editingEmployee._id}/role`, {
              role: form.role,
            });
          } catch (err) {
            return `Profile saved, but the role did not change: ${getApiErrorMessage(err)}`;
          }
        }

        if (changedPassword) {
          try {
            await api.patch(`/employees/${editingEmployee._id}/password`, {
              password: form.password,
            });
          } catch (err) {
            // Named explicitly: the profile change above has already been
            // written, so "failed" on its own would be misleading.
            return `Profile saved, but the password did NOT change: ${getApiErrorMessage(err)}`;
          }

          // Confirmed AFTER the modal closes, not here: Alert.alert while the
          // sheet is open can sit behind it on Android, leaving a dimmed form
          // that swallows every tap (the reason this screen reports failures
          // inline instead).
          confirmation =
            `Password updated for ${form.fullName}. ` +
            "They will be signed out of any existing session.";
        }
      } else {
        await api.post("/employees", form);
      }

      setModalVisible(false);
      fetchEmployees();

      // A password reset is otherwise invisible: the modal just closes, exactly
      // as it does when nothing was changed. Saying so is what tells an admin
      // it actually happened.
      if (confirmation) Alert.alert("Saved", confirmation);

      return null;
    } catch (err) {
      return getApiErrorMessage(err);
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

  // Nobody may change their own role, so the picker disappears when an admin
  // opens their own record -- offering it would only produce a 403.
  const isEditingSelf = editingEmployee && editingEmployee._id === user?._id;
  const assignableRoles = isEditingSelf ? [] : ASSIGNABLE_ROLES[user?.role] || [];

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
        assignableRoles={assignableRoles}
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
