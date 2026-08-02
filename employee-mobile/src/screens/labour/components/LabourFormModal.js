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
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const emptyForm = { labourId: "", fullName: "", mobile: "", address: "", status: "active" };

export default function LabourFormModal({ visible, labour, siteName, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const isEdit = !!labour;

  // Same keyboard handling as the other sheets: iOS needs the sheet lifted,
  // Android's Modal resizes itself, and neither scrolls to the focused field.
  const scrollRef = useRef(null);
  const fieldOffsets = useRef({});
  const focusedField = useRef(null);

  const rememberOffset = (key) => (event) => {
    fieldOffsets.current[key] = event.nativeEvent.layout.y;
  };

  const scrollToField = (key) => {
    const y = fieldOffsets.current[key];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  const handleFocus = (key) => () => {
    focusedField.current = key;
    scrollToField(key);
  };

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (focusedField.current) scrollToField(focusedField.current);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (labour) {
      setForm({
        labourId: labour.labourId || "",
        fullName: labour.fullName || "",
        mobile: labour.mobile || "",
        address: labour.address || "",
        status: labour.status || "active",
      });
    } else {
      setForm(emptyForm);
    }

    setFormError(null);
    setSubmitting(false);
    focusedField.current = null;

    if (!visible) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [labour, visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.labourId.trim()) return "Labour ID is required.";
    if (!form.fullName.trim()) return "Full name is required.";

    // Mobile is optional, but a number that IS entered has to be usable --
    // mirrors the 7-15 digit range the API enforces.
    const digits = form.mobile.replace(/\D/g, "");
    if (digits && (digits.length < 7 || digits.length > 15)) {
      return "Mobile number must be between 7 and 15 digits, or left blank.";
    }

    return null;
  };

  const submit = async () => {
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const failure = await onSubmit(form);
      if (failure) setFormError(failure);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? "Edit Labour" : "Add Labour"}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={22} color={submitting ? "#E5E7EB" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>

          {!!siteName && <Text style={styles.helper}>At {siteName}</Text>}

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!!formError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <View onLayout={rememberOffset("labourId")}>
              <Text style={styles.label}>Labour ID</Text>
              <TextInput
                style={styles.input}
                value={form.labourId}
                onChangeText={update("labourId")}
                onFocus={handleFocus("labourId")}
                placeholder="e.g. L-001"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Must be unique across your whole company.</Text>
            </View>

            <View onLayout={rememberOffset("fullName")}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={form.fullName}
                onChangeText={update("fullName")}
                onFocus={handleFocus("fullName")}
                placeholder="Labourer's name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View onLayout={rememberOffset("mobile")}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={form.mobile}
                onChangeText={update("mobile")}
                onFocus={handleFocus("mobile")}
                placeholder="Leave blank if they have no phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>Optional. If given, it can't match another labourer.</Text>
            </View>

            <View onLayout={rememberOffset("address")}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.address}
                onChangeText={update("address")}
                onFocus={handleFocus("address")}
                placeholder="Optional"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            {isEdit && (
              <>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusRow}>
                  {["active", "inactive"].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.statusBtn, form.status === value && styles.statusBtnActive]}
                      onPress={() => update("status")(value)}
                    >
                      <Text
                        style={[styles.statusText, form.status === value && styles.statusTextActive]}
                      >
                        {value === "active" ? "Active" : "Inactive"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>
                  Inactive labour stops appearing on the attendance sheet but keeps its history.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnBusy]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <View style={styles.submitBusyRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitText}>{isEdit ? "Saving..." : "Adding..."}</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>{isEdit ? "Save Changes" : "Add Labour"}</Text>
              )}
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
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -10,
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

  textarea: {
    height: 70,
    textAlignVertical: "top",
  },

  statusRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 10,
  },

  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  statusBtnActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  statusTextActive: {
    color: "#112250",
  },

  submitBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  submitBtnBusy: {
    opacity: 0.7,
  },

  submitBusyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
