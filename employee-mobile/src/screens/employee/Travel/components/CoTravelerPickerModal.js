import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../../api/api.js";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// selectedIds: array of userIds; onConfirm(ids) closes with the selection.
export default function CoTravelerPickerModal({ visible, selectedIds, onConfirm, onClose }) {
  const [colleagues, setColleagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(selectedIds || []);

  useEffect(() => {
    if (!visible) return;
    setPicked(selectedIds || []);
    setLoading(true);
    api
      .get("/employees/colleagues")
      .then((res) => setColleagues(res.data.colleagues || []))
      .catch(() => setColleagues([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const toggle = (id) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtered = colleagues.filter((c) =>
    [c.fullName, c.department, c.designation]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Co-travelers</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search colleagues..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#112250" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No colleagues found</Text>}
            renderItem={({ item }) => {
              const isPicked = picked.includes(item._id);
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => toggle(item._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(item.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[item.department, item.designation].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isPicked && styles.checkboxOn]}>
                    {isPicked && <Ionicons name="checkmark" size={15} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(picked)}>
            <Text style={styles.confirmText}>
              {picked.length > 0 ? `Add ${picked.length} co-traveler${picked.length > 1 ? "s" : ""}` : "Done"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F5",
  },

  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 6 },

  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1E1B4B" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1E1B4B" },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: { color: "#112250", fontWeight: "700", fontSize: 13 },

  name: { fontSize: 14, fontWeight: "700", color: "#1E1B4B" },

  meta: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxOn: { backgroundColor: "#112250", borderColor: "#112250" },

  emptyText: { textAlign: "center", marginTop: 30, color: "#9CA3AF" },

  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F1F5",
  },

  confirmBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  confirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
