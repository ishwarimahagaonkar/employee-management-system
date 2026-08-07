import React, { useCallback, useContext, useEffect, useState } from "react";
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

import LabourListItem, { LABOUR_ROW_HEIGHT } from "./components/LabourListItem";
import LabourFormModal from "./components/LabourFormModal";

const ROW_STRIDE = LABOUR_ROW_HEIGHT + 6;

// The company's MASTER labour list. There is no site selector here any more:
// a labourer belongs to the company, not to a site, and which site they work
// is decided per day on the attendance roster.
//   supervisor -> sees everyone, can add/edit (needed to build a roster)
//   admin      -> sees everyone, can add/edit
//   manager    -> sees everyone, read-only (labour:manage excludes manager)
export default function LabourScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  // Mirrors labour:manage in backend/src/config/roles.js -- supervisor only.
  // Admin and manager read the master list but never write to it; they oversee
  // through the reports the supervisor files.
  const canEdit = user?.role === "supervisor";

  const [labour, setLabour] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);

  const fetchLabour = async () => {
    try {
      setError(null);
      const res = await api.get("/labour");
      setLabour(res.data.labour || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabour();
  }, []);

  const retry = () => {
    setLoading(true);
    setError(null);
    fetchLabour();
  };

  const openAdd = () => {
    setEditingLabour(null);
    setFormVisible(true);
  };

  const openEdit = useCallback((record) => {
    setEditingLabour(record);
    setFormVisible(true);
  }, []);

  // Returns an error message for the form to show inline, or null once saved.
  const handleSubmit = async (form) => {
    try {
      if (editingLabour) {
        await api.put(`/labour/${editingLabour._id}`, form);
      } else {
        await api.post("/labour", {
          labourId: form.labourId,
          fullName: form.fullName,
          mobile: form.mobile,
          address: form.address,
        });
      }

      setFormVisible(false);
      await fetchLabour();
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  const filtered = labour.filter((l) =>
    [l.fullName, l.labourId, l.mobile]
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
        <Text style={styles.headerTitle}>Labour</Text>

        {canEdit ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtnSpacer} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, ID or mobile"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: ROW_STRIDE, offset: ROW_STRIDE * index, index })}
            initialNumToRender={14}
            maxToRenderPerBatch={10}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {search
                  ? "Nobody matches that search."
                  : canEdit
                    ? "No labour yet. Tap + to add your first worker.\n\nThey can then be put on any site's daily roster."
                    : "No labour has been added yet."}
              </Text>
            }
            renderItem={({ item }) => (
              <LabourListItem labour={item} canEdit={canEdit} onEdit={openEdit} />
            )}
          />
        </>
      )}

      <LabourFormModal
        visible={formVisible}
        labour={editingLabour}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
