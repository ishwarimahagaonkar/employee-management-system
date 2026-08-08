import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import api from "../../../../api/api.js";
import { getApiErrorMessage } from "../../../../utils/apiError.js";

const formatTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

function PhotoBlock({ label, time, photo, loading, offline, receivedAt }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockLabel}>{label}</Text>
        <Text style={styles.blockTime}>{formatTime(time)}</Text>
      </View>

      {/* Shown only when the punch was queued offline. The time above came
          from the employee's own device, and an admin resolving a dispute
          should see both that fact and how long the gap was, rather than
          having to know the system well enough to ask. */}
      {offline && (
        <View style={styles.offlineNote}>
          <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
          <Text style={styles.offlineText}>
            Recorded offline on the employee's device
            {receivedAt ? ` · reached the server at ${formatTime(receivedAt)}` : ""}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#112250" />
          <Text style={styles.placeholderText}>Loading photo…</Text>
        </View>
      ) : photo ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={28} color="#C4C4CC" />
          <Text style={styles.placeholderText}>No photo captured</Text>
        </View>
      )}
    </View>
  );
}

export default function AttendancePhotoModal({ visible, employee, record, onClose }) {
  // Photos are no longer bundled into the attendance list (they are megabytes
  // each), so fetch them for this record when the sheet opens.
  const [photos, setPhotos] = useState({ punchInPhoto: null, punchOutPhoto: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !record?._id) return;

    let cancelled = false;
    setPhotos({ punchInPhoto: null, punchOutPhoto: null });
    setError(null);

    // Nothing to fetch when the record has no photos at all.
    if (!record.hasPunchInPhoto && !record.hasPunchOutPhoto) return;

    setLoading(true);
    api
      .get(`/attendance/${record._id}/photos`)
      .then((res) => {
        if (!cancelled) setPhotos(res.data || {});
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, record?._id]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{employee?.fullName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <PhotoBlock
              label="Punch In"
              time={record?.punchInTime}
              photo={photos.punchInPhoto}
              loading={loading && record?.hasPunchInPhoto}
              offline={record?.punchInOffline}
              receivedAt={record?.punchInReceivedAt}
            />
            <PhotoBlock
              label="Punch Out"
              time={record?.punchOutTime}
              photo={photos.punchOutPhoto}
              loading={loading && record?.hasPunchOutPhoto}
              offline={record?.punchOutOffline}
              receivedAt={record?.punchOutReceivedAt}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  block: {
    marginBottom: 20,
  },

  // Amber, matching the employee-side banner: this is context, not a problem.
  // A red treatment would read as "this punch is suspect", which overstates it.
  offlineNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  offlineText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 15,
  },

  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  blockLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  blockTime: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  photo: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: "#F1F1F5",
  },

  placeholder: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
  },

  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 12,
  },
});
