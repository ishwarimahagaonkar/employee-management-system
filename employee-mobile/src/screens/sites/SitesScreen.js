import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../api/api.js";
import ErrorState from "../../components/ErrorState";
import { getApiErrorMessage } from "../../utils/apiError";
import { AuthContext } from "../../context/AuthContext";
import { useActiveSite } from "../../context/SiteContext";

import SiteListItem from "./components/SiteListItem";
import SiteFormModal from "./components/SiteFormModal";
import SupervisorPickerModal from "./components/SupervisorPickerModal";

// One screen serving three roles, because they need the same list:
//   supervisor    -> the sites they run, and can create more
//   admin/manager -> every site in the company, and can reassign supervisors
// The API applies the same scoping again, so this only decides what to render.
export default function SitesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { refreshSites } = useActiveSite();

  const isSupervisor = user?.role === "supervisor";
  const canReassign = user?.role === "admin" || user?.role === "manager";

  // Mirrors site:create in backend/src/config/roles.js. Anyone who runs work
  // can open a site; only admin and manager can reassign its supervisor.
  const canCreate = ["admin", "manager", "supervisor"].includes(user?.role);

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [reassigningSite, setReassigningSite] = useState(null);
  const [supervisors, setSupervisors] = useState([]);

  const fetchSites = async () => {
    try {
      setError(null);
      const res = await api.get("/sites");
      setSites(res.data.sites || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // The company's supervisors, for assigning one while creating a site.
  //
  // Only admin and manager need this -- a supervisor is assigned their own site
  // by the server -- so the request is skipped for everyone else rather than
  // firing and being ignored. A failure is swallowed: not being able to list
  // supervisors must not stop a site being created without one.
  const fetchSupervisors = async () => {
    if (!canReassign) return;

    try {
      const res = await api.get("/employees", { params: { role: "supervisor" } });
      setSupervisors(res.data.employees || []);
    } catch (err) {
      setSupervisors([]);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchSites();
  };

  useEffect(() => {
    fetchSites();
    fetchSupervisors();
  }, []);

  const openAdd = () => {
    setEditingSite(null);
    setFormVisible(true);
  };

  const openEdit = (site) => {
    setEditingSite(site);
    setFormVisible(true);
  };

  // Returns an error message for the form to show inline, or null once saved.
  const handleSubmit = async (form) => {
    try {
      if (editingSite) {
        await api.put(`/sites/${editingSite._id}`, form);
      } else {
        await api.post("/sites", {
          name: form.name,
          code: form.code,
          location: form.location,
          description: form.description,
          // Only meaningful for an admin or manager. A supervisor creating a
          // site is assigned it by the server regardless of what is sent, so
          // the form does not offer the choice to them.
          supervisorId: form.supervisorId || null,
        });
      }

      setFormVisible(false);
      await fetchSites();
      await refreshSites();
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  const handleAssign = async (supervisorId) => {
    try {
      await api.patch(`/sites/${reassigningSite._id}/supervisor`, { supervisorId });
      setReassigningSite(null);
      await fetchSites();
      await refreshSites();
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  const filtered = sites.filter((s) =>
    [s.name, s.code, s.location, s.supervisorId?.fullName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Everyone who reaches this screen can now create a site, so the old
  // "a supervisor creates these" text was telling admins and managers to wait
  // for someone else while showing them the + button.
  const emptyMessage = canCreate
    ? "No sites yet. Tap + to create your first one."
    : "No sites yet.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSupervisor ? "My Sites" : "Sites"}</Text>

        {/* Admin, manager and supervisor can all open a site. Employees never
            reach this screen, but the check stays role-based rather than
            assumed so the button can never outlive the permission. */}
        {canCreate ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtnSpacer} />
        )}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sites..."
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
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyMessage}</Text>}
          renderItem={({ item }) => (
            <SiteListItem
              site={item}
              canReassign={canReassign}
              onEdit={openEdit}
              onReassign={setReassigningSite}
            />
          )}
        />
      )}

      <SiteFormModal
        visible={formVisible}
        site={editingSite}
        supervisors={supervisors}
        canAssignSupervisor={canReassign}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmit}
      />

      <SupervisorPickerModal
        visible={!!reassigningSite}
        site={reassigningSite}
        onClose={() => setReassigningSite(null)}
        onAssign={handleAssign}
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

  // Keeps the title centred when there's no add button.
  addBtnSpacer: {
    width: 36,
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
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
