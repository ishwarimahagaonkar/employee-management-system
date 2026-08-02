import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const emptyForm = { customerName: "", meetingStartTime: "", meetingEndTime: "", notes: "" };

export default function MeetingDetailsModal({ visible, loading, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  // Keeping the focused field visible is done by hand because the two platforms
  // fail for different reasons. On iOS the Modal window doesn't shrink for the
  // keyboard, so the KeyboardAvoidingView below lifts the sheet. On Android the
  // Modal's dialog sets SOFT_INPUT_ADJUST_RESIZE itself, so the sheet already
  // lifts -- but it becomes short enough that the field being typed into can sit
  // outside it, and a ScrollView won't scroll there on its own.
  const scrollRef = useRef(null);
  const fieldOffsets = useRef({});
  const focusedField = useRef(null);

  const rememberOffset = (key) => (event) => {
    fieldOffsets.current[key] = event.nativeEvent.layout.y;
  };

  const scrollToField = (key) => {
    const y = fieldOffsets.current[key];
    if (y == null) return;
    // Stop a little above the field so its label stays on screen too.
    scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  const handleFocus = (key) => () => {
    focusedField.current = key;
    // Fires when moving between fields while the keyboard is already open --
    // keyboardDidShow won't fire again in that case.
    scrollToField(key);
  };

  // The first focus needs to wait for the keyboard: scrolling before the sheet
  // has resized aims at offsets that are about to change.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (focusedField.current) scrollToField(focusedField.current);
    });

    return () => sub.remove();
  }, []);

  // The sheet stays mounted while hidden, so its scroll position would otherwise
  // survive into the next trip's meeting form.
  useEffect(() => {
    if (visible) return;
    focusedField.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const isValid =
    form.customerName.trim() && form.meetingStartTime.trim() && form.meetingEndTime.trim() && form.notes.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(form);
    setForm(emptyForm);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* iOS only: Android's Modal already resizes for the keyboard, and adding a
          behavior there would shrink an already-shrunk window a second time. */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Meeting Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.helper}>
            Add details about the meeting for your last trip.
          </Text>

          {/* keyboardShouldPersistTaps: without it the first tap on Save while the
              keyboard is open only dismisses the keyboard, so saving took two taps. */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View onLayout={rememberOffset("customerName")}>
              <Text style={styles.label}>Customer Name</Text>
              <TextInput
                style={styles.input}
                value={form.customerName}
                onChangeText={update("customerName")}
                onFocus={handleFocus("customerName")}
                placeholder="e.g. Acme Corp"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Both time fields scroll to the row, which keeps the pair on screen. */}
            <View style={styles.timeRow} onLayout={rememberOffset("times")}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.meetingStartTime}
                  onChangeText={update("meetingStartTime")}
                  onFocus={handleFocus("times")}
                  placeholder="e.g. 2:30 PM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.timeCol}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.meetingEndTime}
                  onChangeText={update("meetingEndTime")}
                  onFocus={handleFocus("times")}
                  placeholder="e.g. 3:00 PM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View onLayout={rememberOffset("notes")}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.notes}
                onChangeText={update("notes")}
                onFocus={handleFocus("notes")}
                placeholder="What was discussed..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
            >
              <Text style={styles.submitText}>{loading ? "Saving..." : "Save Meeting Details"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "85%",
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
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
    marginBottom: 16,
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeCol: {
    flex: 1,
  },

  textarea: {
    height: 90,
    textAlignVertical: "top",
  },

  submitBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  submitBtnDisabled: {
    opacity: 0.5,
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
