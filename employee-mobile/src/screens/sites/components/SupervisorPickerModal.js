import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../api/api.js";
import { getApiErrorMessage } from "../../../utils/apiError";

// Reassigns a site to a different supervisor. Admins and managers only -- the
// API enforces that separately via the site:manage permission.
export default function SupervisorPickerModal({ visible, site, onClose, onAssign }) {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // The employees list accepts a role filter, constrained server-side to
        // roles the caller may manage.
        const res = await api.get("/employees", { params: { role: "supervisor" } });
        if (!cancelled) setSupervisors(res.data.employees || []);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const assign = async (supervisorId) => {
    setBusyId(supervisorId || "none");
    setError(null);

    const failure = await onAssign(supervisorId);

    setBusyId(null);
    if (failure) setError(failure);
  };

  const currentId = site?.supervisorId?._id || site?.supervisorId || null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Supervisor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.helper} numberOfLines={2}>
            {site ? `Who runs ${site.name}?` : ""}
          </Text>

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
              data={supervisors}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No supervisors yet. Create one from the Employees screen first.
                </Text>
              }
              ListFooterComponent={
                // Letting a site sit unassigned is deliberate: a supervisor may
                // leave before a replacement exists, and the site's labour and
                // history must survive that.
                currentId ? (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => assign(null)}
                    disabled={busyId !== null}
                  >
                    <Text style={styles.clearText}>
                      {busyId === "none" ? "Removing..." : "Leave unassigned"}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const isCurrent = String(currentId) === String(item._id);

                return (
                  <TouchableOpacity
                    style={[styles.row, isCurrent && styles.rowCurrent]}
                    onPress={() => assign(item._id)}
                    disabled={busyId !== null || isCurrent}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{item.fullName}</Text>
                      <Text style={styles.rowMeta}>{item.empID}</Text>
                    </View>

                    {busyId === item._id ? (
                      <ActivityIndicator size="small" color="#112250" />
                    ) : isCurrent ? (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
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
    maxHeight: "75%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  helper: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
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
    marginBottom: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },

  rowCurrent: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  rowInfo: {
    flex: 1,
  },

  rowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  rowMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  clearBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  clearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D97706",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    color: "#9CA3AF",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
