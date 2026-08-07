import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import { getApiErrorMessage } from "../../../utils/apiError";

/**
 * Picks who is working at this site today, from the company's master labour
 * list.
 *
 * This is the step that replaced "labour belongs to a site". Nobody is tied to
 * a site any more, so each day the supervisor says who turned up here -- and
 * the same person can be picked by a different site tomorrow.
 *
 * Anyone already on this site's roster is hidden: they're on it, so offering
 * them again is noise.
 */
export default function RosterPickerModal({ visible, siteName, alreadyOn, onClose, onAdd }) {
  const [labour, setLabour] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setSelected([]);
      setSearch("");
      setError(null);
    }
  }, [visible]);

  // Searching runs on the server so the picker stays usable when the master
  // list runs to hundreds of names. Debounced so typing doesn't fire a request
  // per keystroke.
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        setError(null);
        const res = await api.get("/labour", {
          params: { status: "active", ...(search.trim() ? { search: search.trim() } : {}) },
        });
        if (!cancelled) setLabour(res.data.labour || []);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, search]);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async () => {
    if (selected.length === 0 || saving) return;

    setSaving(true);
    setError(null);

    const failure = await onAdd(selected);

    setSaving(false);
    if (failure) setError(failure);
  };

  const onRoster = new Set((alreadyOn || []).map(String));
  const available = labour.filter((l) => !onRoster.has(String(l._id)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Add Labour</Text>
              {!!siteName && <Text style={styles.subtitle}>to {siteName}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={22} color={saving ? "#E5E7EB" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, ID or mobile"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : (
            <FlatList
              data={available}
              keyExtractor={(item) => String(item._id)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {search
                    ? "Nobody matches that search."
                    : onRoster.size > 0
                      ? "Everyone on the master list is already on today's roster."
                      : "No labour on the master list yet. Add people from the Labour screen first."}
                </Text>
              }
              renderItem={({ item }) => {
                const checked = selected.includes(item._id);

                return (
                  <TouchableOpacity
                    style={[styles.row, checked && styles.rowChecked]}
                    onPress={() => toggle(item._id)}
                  >
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={20}
                      color={checked ? "#112250" : "#9CA3AF"}
                    />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>{item.fullName}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {item.labourId}
                        {item.mobile ? ` · ${item.mobile}` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.addBtn, (selected.length === 0 || saving) && styles.addBtnDisabled]}
            onPress={submit}
            disabled={selected.length === 0 || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={styles.busyRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.addText}>Adding...</Text>
              </View>
            ) : (
              <Text style={styles.addText}>
                {selected.length === 0
                  ? "Select labour to add"
                  : `Add ${selected.length} to today`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    height: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E1B4B",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },

  loader: {
    marginVertical: 30,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    marginBottom: 8,
  },

  rowChecked: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  rowInfo: {
    flex: 1,
  },

  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  rowMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: "#9CA3AF",
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  addBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },

  addBtnDisabled: {
    opacity: 0.5,
  },

  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
