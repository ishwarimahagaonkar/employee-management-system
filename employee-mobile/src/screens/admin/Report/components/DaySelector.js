import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 10 + i);

export default function DaySelector({ date, onPrev, onNext, onSelectDate, disableNext }) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [calendarCurrent, setCalendarCurrent] = useState(date);

  const maxDateStr = todayStr();
  const selectedYear = Number(calendarCurrent.split("-")[0]);

  const openPicker = () => {
    setCalendarCurrent(date);
    setPickerVisible(true);
  };

  const handleSelectYear = (year) => {
    const month = calendarCurrent.split("-")[1];
    let candidate = `${year}-${month}-01`;
    if (candidate > maxDateStr) candidate = maxDateStr;
    setCalendarCurrent(candidate);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.arrowBtn} onPress={onPrev}>
          <Ionicons name="chevron-back" size={20} color="#6D5DF6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateBtn} onPress={openPicker}>
          <Ionicons name="calendar-outline" size={16} color="#6D5DF6" style={styles.calendarIcon} />
          <Text style={styles.label}>{formatDate(date)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.arrowBtn, disableNext && styles.arrowBtnDisabled]}
          onPress={onNext}
          disabled={disableNext}
        >
          <Ionicons name="chevron-forward" size={20} color={disableNext ? "#D1D5DB" : "#6D5DF6"} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearRow}
            >
              {YEARS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, year === selectedYear && styles.yearChipActive]}
                  onPress={() => handleSelectYear(year)}
                >
                  <Text style={[styles.yearChipText, year === selectedYear && styles.yearChipTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Calendar
              key={calendarCurrent}
              current={calendarCurrent}
              maxDate={maxDateStr}
              onDayPress={(day) => {
                onSelectDate(day.dateString);
                setPickerVisible(false);
              }}
              onMonthChange={(month) => setCalendarCurrent(month.dateString)}
              markedDates={{ [date]: { selected: true, selectedColor: "#6D5DF6" } }}
              theme={{
                todayTextColor: "#6D5DF6",
                selectedDayBackgroundColor: "#6D5DF6",
                arrowColor: "#6D5DF6",
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  arrowBtnDisabled: {
    backgroundColor: "#F4F6F8",
  },

  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    minWidth: 170,
  },

  calendarIcon: {
    marginRight: 6,
  },

  yearRow: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },

  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F6F8",
  },

  yearChipActive: {
    backgroundColor: "#6D5DF6",
  },

  yearChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  yearChipTextActive: {
    color: "#fff",
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    textAlign: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  calendarCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
  },
});
