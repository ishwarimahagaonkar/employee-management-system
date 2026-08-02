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

const emptyForm = { name: "", code: "", location: "", description: "", status: "active" };

// Mirrors CODE_PATTERN in the API's siteController, so a bad code is caught
// here instead of costing a round trip.
const CODE_REGEX = /^[A-Za-z0-9_-]{2,20}$/;

export default function SiteFormModal({ visible, site, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const isEdit = !!site;

  // Same keyboard handling as the meeting form: iOS needs the sheet lifted,
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
    if (site) {
      setForm({
        name: site.name || "",
        code: site.code || "",
        location: site.location || "",
        description: site.description || "",
        status: site.status || "active",
      });
    } else {
      setForm(emptyForm);
    }

    setFormError(null);
    setSubmitting(false);
    focusedField.current = null;

    if (!visible) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [site, visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.name.trim()) return "Site name is required.";
    if (!form.code.trim()) return "Site code is required.";
    if (!CODE_REGEX.test(form.code.trim())) {
      return "Site code must be 2-20 characters: letters, numbers, dashes or underscores, no spaces.";
    }
    if (!form.location.trim()) return "Location is required.";
    return null;
  };

  // Errors show inside the sheet rather than through Alert.alert, which on
  // Android can land behind an open Modal and leave a dead, dimmed form.
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
            <Text style={styles.title}>{isEdit ? "Edit Site" : "Add Site"}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={22} color={submitting ? "#E5E7EB" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>

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

            <View onLayout={rememberOffset("name")}>
              <Text style={styles.label}>Site Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={update("name")}
                onFocus={handleFocus("name")}
                placeholder="ABC Construction"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View onLayout={rememberOffset("code")}>
              <Text style={styles.label}>Site Code</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={update("code")}
                onFocus={handleFocus("code")}
                placeholder="ABC"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.hint}>A short handle for this site. Must be unique in your company.</Text>
            </View>

            <View onLayout={rememberOffset("location")}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={form.location}
                onChangeText={update("location")}
                onFocus={handleFocus("location")}
                placeholder="Site address"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View onLayout={rememberOffset("description")}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.description}
                onChangeText={update("description")}
                onFocus={handleFocus("description")}
                placeholder="What happens at this site (optional)"
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
                  Inactive sites stay in reports and keep their labour records.
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
                  <Text style={styles.submitText}>{isEdit ? "Saving..." : "Creating..."}</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>{isEdit ? "Save Changes" : "Create Site"}</Text>
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
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
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
    height: 80,
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
