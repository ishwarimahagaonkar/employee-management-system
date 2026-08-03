import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import DateField from "../../Holidays/components/DateField";

const emptyForm = {
  empID: "",
  fullName: "",
  email: "",
  password: "",
  department: "",
  designation: "",
  hourlyRate: "",
  JoiningDate: "",
  role: "employee",
};

// Mirrors the rules the API enforces, so a rejected save is caught here and
// shown next to the field instead of costing a round trip.
const PASSWORD_HINT = "At least 8 characters, including one letter and one number.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordProblem = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  employee: "Employee",
};

/**
 * Password input with a reveal toggle.
 *
 * The input keeps the app's normal field styling; the eye sits inside the
 * border rather than beside it, so the field still lines up with every other
 * one in the form.
 *
 * autoComplete/textContentType are off: this form sets SOMEONE ELSE'S
 * password, and without that both platforms offer to save it into the admin's
 * own password manager.
 */
function PasswordField({ value, onChangeText, placeholder, visible, onToggle }) {
  return (
    <View style={styles.passwordWrap}>
      <TextInput
        style={styles.passwordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
      />

      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={onToggle}
        // Generous target: the icon itself is smaller than a fingertip.
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>
    </View>
  );
}

/**
 * assignableRoles: the roles the signed-in user may grant, straight from the
 * server's own rules. An empty list hides the picker entirely -- that's how
 * editing your own account works, since nobody may change their own role.
 */
export default function EmployeeFormModal({
  visible,
  employee,
  assignableRoles = [],
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!employee;

  // The error now sits at the bottom of the form, so on a long form it can be
  // off screen when it appears. These scroll it into view.
  const scrollRef = useRef(null);
  const errorOffset = useRef(0);

  const revealError = () => {
    // A frame's delay lets the banner lay out before we scroll to where it is.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(errorOffset.current - 40, 0),
        animated: true,
      });
    });
  };

  useEffect(() => {
    if (employee) {
      setForm({
        ...emptyForm,
        empID: employee.empID || "",
        fullName: employee.fullName || "",
        email: employee.email || "",
        password: "",
        department: employee.department || "",
        designation: employee.designation || "",
        hourlyRate: employee.hourlyRate != null ? String(employee.hourlyRate) : "",
        JoiningDate: employee.joiningDate || employee.JoiningDate || "",
        role: employee.role || "employee",
      });
    } else {
      setForm(emptyForm);
    }

    setFormError(null);
    setSubmitting(false);
    // Never leave a password revealed from a previous employee's form.
    setShowPassword(false);
  }, [employee, visible]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Returns the first problem with the form, or null when it's ready to send.
  const validate = () => {
    const required = isEdit
      ? { "Employee ID": form.empID, "Full name": form.fullName, Department: form.department, Designation: form.designation }
      : {
          "Employee ID": form.empID,
          "Full name": form.fullName,
          Email: form.email,
          Password: form.password,
          Department: form.department,
          Designation: form.designation,
          "Joining date": form.JoiningDate,
        };

    const missing = Object.keys(required).filter((label) => !String(required[label]).trim());
    if (missing.length) {
      return `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required.`;
    }

    if (!isEdit && !EMAIL_REGEX.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    // On edit the password field is an optional reset -- blank keeps the current one.
    if (form.password) {
      const weak = passwordProblem(form.password);
      if (weak) return weak;
    }

    // Hourly rate feeds payroll and the salary slip PDF (see the hint under
    // the field), so a bad value here becomes a wrong payment later.
    if (form.hourlyRate) {
      const rate = Number(form.hourlyRate);

      if (isNaN(rate) || rate < 0) {
        return "Hourly rate must be a number that isn't negative.";
      }
      // Catches a decimal point typed in the wrong place before it reaches
      // payroll. Deliberately generous rather than a policy limit.
      if (rate > 100000) {
        return "Hourly rate looks too high. Enter the rate per hour, not per month.";
      }
    }

    // The date comes from a calendar picker, so it is always a real date in
    // YYYY-MM-DD. No range limit: back-dating an existing employee and
    // recording a future start are both legitimate.
    if (form.JoiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.JoiningDate.trim())) {
      return "Pick a joining date from the calendar.";
    }

    return null;
  };

  // Errors are shown inside the sheet rather than through Alert.alert: an alert
  // raised while this Modal is open can land behind it on Android, leaving a
  // dimmed form that ignores every tap and looks like the app has frozen.
  const submit = async () => {
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setFormError(problem);
      revealError();
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const failure = await onSubmit(form);
      if (failure) {
        setFormError(failure);
        revealError();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? "Edit Employee" : "Add Employee"}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={22} color={submitting ? "#E5E7EB" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              value={form.empID}
              onChangeText={update("empID")}
              placeholder="EMP001"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={update("fullName")}
              placeholder="Jane Doe"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={update("email")}
              placeholder="jane@company.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isEdit}
            />

            {isEdit && (
              <>
                <Text style={styles.label}>Reset Password</Text>
                <PasswordField
                  value={form.password}
                  onChangeText={update("password")}
                  placeholder="Leave blank to keep current"
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
                {!!form.password && <Text style={styles.hint}>{PASSWORD_HINT}</Text>}
              </>
            )}

            {!isEdit && (
              <>
                <Text style={styles.label}>Password</Text>
                <PasswordField
                  value={form.password}
                  onChangeText={update("password")}
                  placeholder="Temporary password"
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
                <Text style={styles.hint}>{PASSWORD_HINT}</Text>
              </>
            )}

            {/* Shown when editing too, which is what makes a role editable at
                all. The list comes from the server's rules, so a manager is
                never offered Manager or Admin. */}
            {assignableRoles.length > 0 && (
              <>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  {assignableRoles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
                      onPress={() => update("role")(role)}
                    >
                      <Text
                        style={[styles.roleBtnText, form.role === role && styles.roleBtnTextActive]}
                      >
                        {ROLE_LABELS[role] || role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {isEdit && form.role !== (employee?.role || "employee") && (
                  <Text style={styles.hint}>
                    {`Changing this to ${ROLE_LABELS[form.role] || form.role} takes effect straight away. ` +
                      `They stay signed in and keep anything they're part-way through.`}
                  </Text>
                )}
              </>
            )}

            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              value={form.department}
              onChangeText={update("department")}
              placeholder="Engineering"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              value={form.designation}
              onChangeText={update("designation")}
              placeholder="Software Engineer"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Hourly Rate</Text>
            <TextInput
              style={styles.input}
              value={form.hourlyRate}
              onChangeText={update("hourlyRate")}
              placeholder="e.g. 250"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            {/* Says plainly what the number does. It is multiplied by the
                hours this person actually worked, so leaving it at 0 means
                their payroll and salary slip both come out as zero. */}
            <Text style={styles.hint}>
              Pay per hour worked. Used for payroll and the salary slip; leave
              blank only if this person isn't paid hourly.
            </Text>

            {/* A calendar rather than a typed string: it cannot produce an
                invalid date, and it accepts any date -- past hires and future
                start dates are both normal. Same picker the Holidays and
                Leave screens use. */}
            <DateField
              label="Joining Date"
              value={form.JoiningDate}
              onChange={update("JoiningDate")}
            />

            {/* Errors live at the FOOT of the form, next to the button that
                triggers them, and are scrolled into view when they appear.
                At the top they were off screen by the time anyone had filled
                the form in, so a failed save looked like nothing happened. */}
            {!!formError && (
              <View
                style={styles.errorBanner}
                onLayout={(e) => { errorOffset.current = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
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
                <Text style={styles.submitText}>{isEdit ? "Save Changes" : "Create Employee"}</Text>
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

  // Mirrors `input` so the password field is indistinguishable from its
  // neighbours, with the eye sitting inside the border.
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingRight: 12,
    marginBottom: 16,
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E1B4B",
  },

  eyeBtn: {
    paddingLeft: 4,
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

  roleRow: {
    flexDirection: "row",
    // Four roles don't fit across a phone, so they wrap two-up.
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 10,
  },

  roleBtn: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  roleBtnActive: {
    backgroundColor: "#EEECFF",
    borderColor: "#112250",
  },

  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  roleBtnTextActive: {
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
    opacity: 0.75,
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
