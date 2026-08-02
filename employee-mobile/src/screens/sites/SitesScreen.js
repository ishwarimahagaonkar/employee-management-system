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

import SiteListItem from "./components/SiteListItem";
import SiteFormModal from "./components/SiteFormModal";
import SupervisorPickerModal from "./components/SupervisorPickerModal";

// One screen serving three roles, because they need the same list:
//   supervisor    -> the sites they run, and can create more
//   admin/manager -> every site in the company, and can reassign supervisors
// The API applies the same scoping again, so this only decides what to render.
export default function SitesScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const isSupervisor = user?.role === "supervisor";
  const canReassign = user?.role === "admin" || user?.role === "manager";

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [reassigningSite, setReassigningSite] = useState(null);

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

  const retry = () => {
    setLoading(true);
    fetchSites();
  };

  useEffect(() => {
    fetchSites();
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
        });
      }

      setFormVisible(false);
      await fetchSites();
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

  const emptyMessage = isSupervisor
    ? "No sites yet. Tap + to create your first one."
    : "No sites yet. A supervisor creates these.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSupervisor ? "My Sites" : "Sites"}</Text>

        {/* Only supervisors create sites; the API rejects anyone else, so the
            button would be a dead end for admins and managers. */}
        {isSupervisor ? (
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
