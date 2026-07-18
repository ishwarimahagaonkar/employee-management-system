import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const pad2 = (n) => String(n).padStart(2, "0");

const lastDayOfMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const formatDisplay = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

export default function PeriodPickerModal({ visible, initialStartDate, initialEndDate, onConfirm, onClose }) {
  const [mode, setMode] = useState("month");

  const today = todayStr();
  const [year, setYear] = useState(Number((initialStartDate || today).split("-")[0]));
  const [selectedMonth, setSelectedMonth] = useState(Number((initialStartDate || today).split("-")[1]) - 1);

  const [customStart, setCustomStart] = useState(initialStartDate || today);
  const [customEnd, setCustomEnd] = useState(initialEndDate || today);
  const [pickingField, setPickingField] = useState("start");

  const maxYear = Number(today.split("-")[0]);

  const handleConfirmMonth = () => {
    const start = `${year}-${pad2(selectedMonth + 1)}-01`;
    const lastDay = lastDayOfMonth(year, selectedMonth);
    let end = `${year}-${pad2(selectedMonth + 1)}-${pad2(lastDay)}`;
    if (end > today) end = today;
    onConfirm(start, end, `${MONTHS[selectedMonth]} ${year}`);
  };

  const handleConfirmCustom = () => {
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    onConfirm(start, end, `${formatDisplay(start)} to ${formatDisplay(end)}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Reporting Period</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#1E1B4B" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === "month" && styles.tabActive]}
              onPress={() => setMode("month")}
            >
              <Text style={[styles.tabText, mode === "month" && styles.tabTextActive]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "custom" && styles.tabActive]}
              onPress={() => setMode("custom")}
            >
              <Text style={[styles.tabText, mode === "custom" && styles.tabTextActive]}>Custom Range</Text>
            </TouchableOpacity>
          </View>

          {mode === "month" ? (
            <View style={styles.body}>
              <View style={styles.yearRow}>
                <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.yearArrow}>
                  <Ionicons name="chevron-back" size={20} color="#112250" />
                </TouchableOpacity>
                <Text style={styles.yearText}>{year}</Text>
                <TouchableOpacity
                  onPress={() => setYear((y) => Math.min(y + 1, maxYear))}
                  style={styles.yearArrow}
                  disabled={year >= maxYear}
                >
                  <Ionicons name="chevron-forward" size={20} color={year >= maxYear ? "#D1D5DB" : "#112250"} />
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {MONTHS.map((m, idx) => {
                  const disabled = `${year}-${pad2(idx + 1)}-01` > today;
                  const active = idx === selectedMonth && !disabled;
                  return (
                    <TouchableOpacity
                      key={m}
                      disabled={disabled}
                      style={[styles.monthChip, active && styles.monthChipActive, disabled && styles.monthChipDisabled]}
                      onPress={() => setSelectedMonth(idx)}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          active && styles.monthChipTextActive,
                          disabled && styles.monthChipTextDisabled,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmMonth}>
                <Text style={styles.confirmText}>Apply</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.body}>
              <View style={styles.rangeRow}>
                <TouchableOpacity
                  style={[styles.rangeField, pickingField === "start" && styles.rangeFieldActive]}
                  onPress={() => setPickingField("start")}
                >
                  <Text style={styles.rangeLabel}>Start Date</Text>
                  <Text style={styles.rangeValue}>{formatDisplay(customStart)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rangeField, pickingField === "end" && styles.rangeFieldActive]}
                  onPress={() => setPickingField("end")}
                >
                  <Text style={styles.rangeLabel}>End Date</Text>
                  <Text style={styles.rangeValue}>{formatDisplay(customEnd)}</Text>
                </TouchableOpacity>
              </View>

              <Calendar
                key={pickingField}
                current={pickingField === "end" ? customEnd : customStart}
                maxDate={today}
                onDayPress={(day) => {
                  if (pickingField === "end") {
                    setCustomEnd(day.dateString);
                  } else {
                    setCustomStart(day.dateString);
                  }
                }}
                markedDates={{
                  [customStart]: { selected: true, selectedColor: "#112250" },
                  [customEnd]: { selected: true, selectedColor: "#112250" },
                }}
                theme={{
                  todayTextColor: "#112250",
                  selectedDayBackgroundColor: "#112250",
                  arrowColor: "#112250",
                }}
              />

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmCustom}>
                <Text style={styles.confirmText}>Apply</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F4F6F8",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: "#112250",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  tabTextActive: {
    color: "#fff",
  },

  body: {
    paddingHorizontal: 20,
  },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  yearArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  yearText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginHorizontal: 20,
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  monthChip: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    marginBottom: 10,
  },

  monthChipActive: {
    backgroundColor: "#112250",
  },

  monthChipDisabled: {
    opacity: 0.4,
  },

  monthChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
  },

  monthChipTextActive: {
    color: "#fff",
  },

  monthChipTextDisabled: {
    color: "#9CA3AF",
  },

  rangeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  rangeField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  rangeFieldActive: {
    borderColor: "#112250",
  },

  rangeLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },

  rangeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E1B4B",
  },

  confirmBtn: {
    backgroundColor: "#112250",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },

  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
