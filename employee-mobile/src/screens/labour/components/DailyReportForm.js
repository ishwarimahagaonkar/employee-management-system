import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import TimeField from "../../../components/TimeField";

const emptyForm = {
  startTime: "",
  endTime: "",
  workCompleted: "",
  materialsUsed: "",
  equipmentUsed: "",
  problemsFaced: "",
  safetyIncidents: "",
  additionalNotes: "",
};

// Optional free-text sections, rendered in one pass so the list stays in step
// with what the API accepts.
const SECTIONS = [
  { key: "materialsUsed", label: "Materials Used", placeholder: "Cement, steel, sand..." },
  { key: "equipmentUsed", label: "Equipment Used", placeholder: "Mixer, crane, scaffolding..." },
  { key: "problemsFaced", label: "Problems Faced", placeholder: "Anything that held work up" },
  { key: "safetyIncidents", label: "Safety Incidents", placeholder: "Leave blank if none" },
  { key: "additionalNotes", label: "Additional Notes", placeholder: "Anything else worth recording" },
];

export default function DailyReportForm({
  report,
  editable,
  labourPresent,
  labourAbsent,
  attendanceMarked,
  submitting,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);

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
    if (report) {
      setForm({
        startTime: report.startTime || "",
        endTime: report.endTime || "",
        workCompleted: report.workCompleted || "",
        materialsUsed: report.materialsUsed || "",
        equipmentUsed: report.equipmentUsed || "",
        problemsFaced: report.problemsFaced || "",
        safetyIncidents: report.safetyIncidents || "",
        additionalNotes: report.additionalNotes || "",
      });
    } else {
      setForm(emptyForm);
    }

    setFormError(null);
  }, [report]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.workCompleted.trim()) return "Work completed is required.";

    const valid = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    if (form.startTime && !valid(form.startTime)) return "Start time must look like 09:00.";
    if (form.endTime && !valid(form.endTime)) return "End time must look like 18:00.";
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      return "End time must be after start time.";
    }

    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    setFormError(null);
    const failure = await onSubmit(form);
    if (failure) setFormError(failure);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!!formError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

        {!editable && !!report && (
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed" size={16} color="#6B7280" />
            <Text style={styles.lockedText}>
              This report was submitted on an earlier day, so it can no longer be changed here.
            </Text>
          </View>
        )}

        {/* Read-only: these come from the attendance sheet, never typed, so the
            report and the attendance records can't disagree. */}
        <View style={styles.countsCard}>
          <View style={styles.countBox}>
            <Text style={styles.countValue}>{labourPresent}</Text>
            <Text style={styles.countLabel}>Present</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countBox}>
            <Text style={styles.countValue}>{labourAbsent}</Text>
            <Text style={styles.countLabel}>Absent</Text>
          </View>
        </View>

        {!attendanceMarked && (
          <Text style={styles.countsHint}>
            No labour attendance marked for this day yet. Mark it first, or these counts stay at zero.
          </Text>
        )}

        {/* Clock pickers rather than typed text. The stored value is still a
            plain "HH:MM" string, so validate() below and the server's working-
            hours calculation are untouched -- only the input method changed.
            A locked report shows the times read-only rather than a dead field. */}
        <View style={styles.timeRow} onLayout={rememberOffset("times")}>
          {editable ? (
            <>
              <TimeField
                label="Start Time"
                value={form.startTime}
                onChange={update("startTime")}
                defaultHour={9}
                style={styles.timeCol}
              />

              <TimeField
                label="End Time"
                value={form.endTime}
                onChange={update("endTime")}
                defaultHour={18}
                style={styles.timeCol}
              />
            </>
          ) : (
            <>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Start Time</Text>
                <Text style={styles.readOnlyValue}>{form.startTime || "--:--"}</Text>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.label}>End Time</Text>
                <Text style={styles.readOnlyValue}>{form.endTime || "--:--"}</Text>
              </View>
            </>
          )}
        </View>

        <View onLayout={rememberOffset("workCompleted")}>
          <Text style={styles.label}>Work Completed *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.workCompleted}
            onChangeText={update("workCompleted")}
            onFocus={handleFocus("workCompleted")}
            placeholder="What was done on site today"
            placeholderTextColor="#9CA3AF"
            multiline
            editable={editable}
          />
        </View>

        {SECTIONS.map((section) => (
          <View key={section.key} onLayout={rememberOffset(section.key)}>
            <Text style={styles.label}>{section.label}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form[section.key]}
              onChangeText={update(section.key)}
              onFocus={handleFocus(section.key)}
              placeholder={section.placeholder}
              placeholderTextColor="#9CA3AF"
              multiline
              editable={editable}
            />
          </View>
        ))}

        {editable && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnBusy]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <View style={styles.submitBusyRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {report ? "Update Report" : "Submit Report"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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

  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  lockedText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  countsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  countBox: {
    flex: 1,
    alignItems: "center",
  },

  countDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },

  countValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#112250",
  },

  countLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  countsHint: {
    fontSize: 12,
    color: "#D97706",
    marginBottom: 16,
    lineHeight: 17,
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

  textarea: {
    height: 80,
    textAlignVertical: "top",
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Shown instead of a picker on a settled report: a disabled field reads as
  // broken, whereas plain text reads as a record.
  readOnlyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    paddingVertical: 12,
  },

  timeCol: {
    flex: 1,
  },

  submitBtn: {
    backgroundColor: "#112250",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
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
