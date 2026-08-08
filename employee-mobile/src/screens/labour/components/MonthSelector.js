import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Asia/Kolkata, like every other date in this system.
const nowParts = () => {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [y, m] = s.split("-").map(Number);
  return { year: y, month: m - 1 };
};

/**
 * First and last "YYYY-MM-DD" of a month, ready for the API's startDate /
 * endDate. Day 0 of the NEXT month is the last day of this one, which avoids
 * hardcoding 28/29/30/31 and gets February right in leap years for free.
 */
export const monthRange = (year, month) => {
  const pad = (n) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
};

export const monthLabel = (year, month) => `${FULL[month]} ${year}`;

/**
 * Year + month picker for browsing filed reports.
 *
 * A day stepper is right for a supervisor filing today's report, but wrong for
 * an admin asking "what happened in July" -- that is 31 taps. This jumps
 * straight to a month, and refuses to offer months that haven't happened yet
 * rather than showing an empty list and leaving you wondering.
 */
export default function MonthSelector({ year, month, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);

  const current = nowParts();
  const isFuture = (y, m) => y > current.year || (y === current.year && m > current.month);

  // Stepping a month at a time, which is the common move.
  const step = (delta) => {
    let m = month + delta;
    let y = year;

    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }

    if (isFuture(y, m)) return;
    onChange(y, m);
  };

  const openPicker = () => {
    setDraftYear(year);
    setOpen(true);
  };

  const atCurrentMonth = year === current.year && month === current.month;

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.arrow} onPress={() => step(-1)}>
          <Ionicons name="chevron-back" size={20} color="#112250" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.label} onPress={openPicker} activeOpacity={0.6}>
          <Text style={styles.labelText}>{monthLabel(year, month)}</Text>
          <Ionicons name="chevron-down" size={14} color="#112250" />
        </TouchableOpacity>

        {/* Reports can't exist for a month that hasn't happened. */}
        <TouchableOpacity
          style={[styles.arrow, atCurrentMonth && styles.arrowDisabled]}
          onPress={() => step(1)}
          disabled={atCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={atCurrentMonth ? "#D1D5DB" : "#112250"} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setDraftYear(draftYear - 1)} style={styles.arrow}>
                <Ionicons name="chevron-back" size={20} color="#112250" />
              </TouchableOpacity>

              <Text style={styles.yearText}>{draftYear}</Text>

              <TouchableOpacity
                onPress={() => draftYear < current.year && setDraftYear(draftYear + 1)}
                disabled={draftYear >= current.year}
                style={[styles.arrow, draftYear >= current.year && styles.arrowDisabled]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={draftYear >= current.year ? "#D1D5DB" : "#112250"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {MONTHS.map((label, index) => {
                const disabled = isFuture(draftYear, index);
                const selected = draftYear === year && index === month;

                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.month,
                      selected && styles.monthSelected,
                      disabled && styles.monthDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() => {
                      onChange(draftYear, index);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthText,
                        selected && styles.monthTextSelected,
                        disabled && styles.monthTextDisabled,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  arrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowDisabled: {
    opacity: 0.5,
  },

  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  sheet: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
  },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  yearText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E1B4B",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  month: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  monthSelected: {
    backgroundColor: "#112250",
    borderColor: "#112250",
  },

  monthDisabled: {
    opacity: 0.4,
  },

  monthText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  monthTextSelected: {
    color: "#fff",
  },

  monthTextDisabled: {
    color: "#9CA3AF",
  },
});
