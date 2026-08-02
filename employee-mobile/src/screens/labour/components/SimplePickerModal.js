import React from "react";
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

/**
 * Generic single-choice picker used for the report's Labour and Supervisor
 * filters.
 *
 * items: [{ _id, title, subtitle }]
 * An "All" row is always offered, because every filter here is optional.
 */
export default function SimplePickerModal({
  visible,
  title,
  allLabel = "All",
  items,
  loading,
  selectedId,
  onSelect,
  onClose,
}) {
  const choose = (id) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#112250" style={styles.loader} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.row, !selectedId && styles.rowCurrent]}
                  onPress={() => choose(null)}
                >
                  <Text style={styles.rowName}>{allLabel}</Text>
                  {!selectedId && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
                </TouchableOpacity>
              }
              ListEmptyComponent={<Text style={styles.emptyText}>Nothing to choose from yet.</Text>}
              renderItem={({ item }) => {
                const isCurrent = String(selectedId) === String(item._id);

                return (
                  <TouchableOpacity
                    style={[styles.row, isCurrent && styles.rowCurrent]}
                    onPress={() => choose(item._id)}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{item.title}</Text>
                      {!!item.subtitle && <Text style={styles.rowMeta}>{item.subtitle}</Text>}
                    </View>
                    {isCurrent && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
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
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
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
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  rowMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  emptyText: {
    textAlign: "center",
    marginVertical: 20,
    color: "#9CA3AF",
  },
});
