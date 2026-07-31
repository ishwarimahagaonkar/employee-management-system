import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../../api/api.js";
import HolidayListItem from "./components/HolidayListItem";
import HolidayFormModal from "./components/HolidayFormModal";
import ErrorState from "../../../components/ErrorState";
import { getApiErrorMessage } from "../../../utils/apiError";

export default function HolidaysScreen({ navigation }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const fetchHolidays = async () => {
    try {
      setError(null);
      const res = await api.get("/holidays");
      setHolidays(res.data.holidays || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchHolidays();
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
    }, [])
  );

  // Returns an error message for the form to display, or null once saved --
  // the modal shows it inline, since an Alert raised over an open Modal can be
  // hidden behind it on Android and strand the admin on a dead sheet.
  const handleSubmit = async (form, resetForm) => {
    try {
      await api.post("/holidays", form);

      setModalVisible(false);
      resetForm();
      fetchHolidays();
      return null;
    } catch (err) {
      return getApiErrorMessage(err);
    }
  };

  const handleDelete = (holiday) => {
    Alert.alert("Delete Holiday", `Remove "${holiday.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/holidays/${holiday._id}`);
            fetchHolidays();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to delete holiday");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Holidays</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Holidays are excluded from working days in attendance and reports.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#112250" style={styles.loader} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <FlatList
          data={holidays}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No holidays added yet</Text>}
          renderItem={({ item }) => <HolidayListItem holiday={item} onDelete={handleDelete} />}
        />
      )}

      <HolidayFormModal
        visible={modalVisible}
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

  subtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    paddingHorizontal: 20,
    marginBottom: 16,
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
