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

import LabourListItem from "./components/LabourListItem";
import LabourFormModal from "./components/LabourFormModal";
import SiteChipSelector from "./components/SiteChipSelector";

// Labour belongs to a site, so this screen is always "labour at site X".
//   supervisor -> their own sites, and can add/edit labour
//   admin      -> every site, and can add/edit labour
//   manager    -> every site, read-only (labour:manage excludes manager)
export default function LabourScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const canEdit = user?.role === "admin" || user?.role === "supervisor";

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [labour, setLabour] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingLabour, setLoadingLabour] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);

  const fetchSites = async () => {
    try {
      setError(null);
      const res = await api.get("/sites");
      const list = res.data.sites || [];
      setSites(list);

      // Default to the first site so the screen has something to show.
      if (list.length > 0) setSelectedSiteId((prev) => prev || list[0]._id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchLabour = async (siteId) => {
    if (!siteId) return;

    setLoadingLabour(true);

    try {
      setError(null);
      const res = await api.get("/labour", { params: { siteId } });
      setLabour(res.data.labour || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingLabour(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) fetchLabour(selectedSiteId);
  }, [selectedSiteId]);

  const retry = () => {
    setLoadingSites(true);
    setError(null);
    fetchSites();
  };

  const openAdd = () => {
    setEditingLabour(null);
    setFormVisible(true);
  };

  const openEdit = (record) => {
    setEditingLabour(record);
    setFormVisible(true);
  };

  // Returns an error message for the form to show inline, or null once saved.
  const handleSubmit = async (form) => {
    try {
      if (editingLabour) {
        await api.put(`/labour/${editingLabour._id}`, form);
      } else {
        await api.post("/labour", {
          siteId: selectedSiteId,
          labourId: form.labourId,
          fullName: form.fullName,
          mobile: form.mobile,
          address: form.address,
        });
      }

      setFormVisible(false);
      await fetchLabour(selectedSiteId);
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  const selectedSite = sites.find((s) => String(s._id) === String(selectedSiteId));

  const filtered = labour.filter((l) =>
    [l.fullName, l.labourId, l.mobile]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const noSites = !loadingSites && sites.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour</Text>

        {/* Adding needs a site to add to, so the button waits for one. */}
        {canEdit && selectedSiteId ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtnSpacer} />
        )}
      </View>

      {loadingSites ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : error && sites.length === 0 ? (
        <ErrorState message={error} onRetry={retry} />
      ) : noSites ? (
        <Text style={styles.emptyText}>
          {user?.role === "supervisor"
            ? "No sites assigned to you yet. Create a site first, then add labour to it."
            : "No sites yet. A supervisor creates these before labour can be added."}
        </Text>
      ) : (
        <>
          <SiteChipSelector
            sites={sites}
            selectedId={selectedSiteId}
            onSelect={setSelectedSiteId}
          />

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search labour..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loadingLabour ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchLabour(selectedSiteId)} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {canEdit
                    ? "No labour at this site yet. Tap + to add the first."
                    : "No labour at this site yet."}
                </Text>
              }
              renderItem={({ item }) => (
                <LabourListItem labour={item} canEdit={canEdit} onEdit={openEdit} />
              )}
            />
          )}
        </>
      )}

      <LabourFormModal
        visible={formVisible}
        labour={editingLabour}
        siteName={selectedSite?.name}
        onClose={() => setFormVisible(false)}
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
