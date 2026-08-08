import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

// Fixed so the list can use getItemLayout -- see LabourAttendanceScreen. Any
// change here must be mirrored there or scrolling estimates go wrong.
export const ROW_HEIGHT = 58;

// "HH:MM" <-> Date, only ever used to drive the picker. The stored value stays
// a plain "09:00" string, matching what the server validates and every report
// already reads.
const toDate = (hhmm) => {
  const d = new Date();
  const [h, m] = /^\d{2}:\d{2}$/.test(hhmm || "") ? hhmm.split(":").map(Number) : [9, 0];
  d.setHours(h, m, 0, 0);
  return d;
};

const toHHMM = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/**
 * One labourer on the day's roster.
 *
 * The flow is sequential on purpose: punch in, then punch out. Presence is not
 * a thing the supervisor toggles -- it is what having both punches MEANS, and
 * the server derives it the same way. There is no Absent button: anyone left
 * on the roster who was never punched in is absent, which removes a whole
 * class of "marked present by accident" mistakes.
 */
function AttendanceRow({ row, onChange, onRemove }) {
  const { labour, punchIn, punchOut, editable, workingHours } = row;

  // Which picker is open, if any: "in" | "out" | null.
  const [picking, setPicking] = useState(null);

  const complete = !!punchIn && !!punchOut;

  const onPicked = (event, selected) => {
    // Android fires with type "dismissed" when the user backs out; iOS keeps
    // the spinner mounted, so it is closed explicitly either way.
    setPicking(null);

    if (event?.type === "dismissed" || !selected) return;

    const value = toHHMM(selected);

    if (picking === "in") {
      onChange(labour._id, { marked: true, punchIn: value });
    } else if (picking === "out") {
      onChange(labour._id, { marked: true, punchOut: value });
    }
  };

  return (
    <View style={[styles.row, !editable && styles.rowLocked]}>
      <View style={styles.identity}>
        <Text style={styles.name} numberOfLines={1}>{labour.fullName}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {labour.labourId}
          {complete && workingHours ? ` · ${workingHours}h` : ""}
          {punchIn && !punchOut ? " · on site" : ""}
          {!punchIn ? " · not in" : ""}
        </Text>
      </View>

      {editable ? (
        <View style={styles.actions}>
          {/* Removing is for someone rostered by mistake -- offered only before
              they've been punched in. After that, correcting the time is
              right, not deleting the record. */}
          {!punchIn && onRemove && (
            <TouchableOpacity
              onPress={() => onRemove(labour._id)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={16} color="#C4C9D2" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.punch, punchIn && styles.punchInSet]}
            onPress={() => setPicking("in")}
          >
            <Text style={[styles.punchText, punchIn && styles.punchInSetText]}>
              {punchIn || "In"}
            </Text>
          </TouchableOpacity>

          {/* Punch out only becomes available once they are in, so the
              sequence cannot be performed backwards -- the server rejects that
              pair anyway, and a disabled button explains it sooner. */}
          <TouchableOpacity
            style={[
              styles.punch,
              !punchIn && styles.punchDisabled,
              punchOut && styles.punchOutSet,
            ]}
            onPress={() => punchIn && setPicking("out")}
            disabled={!punchIn}
          >
            <Text
              style={[
                styles.punchText,
                !punchIn && styles.punchDisabledText,
                punchOut && styles.punchOutSetText,
              ]}
            >
              {punchOut || "Out"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={11} color="#9CA3AF" />
          <Text style={styles.lockedText}>
            {complete ? `${punchIn}-${punchOut}` : punchIn ? `${punchIn}-` : "A"}
          </Text>
        </View>
      )}

      {picking && (
        <DateTimePicker
          value={toDate(picking === "in" ? punchIn : punchOut)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={onPicked}
        />
      )}
    </View>
  );
}

/**
 * Memoised, because the sheet rebuilds its whole rows array on every change.
 * Without this, setting one time re-rendered every mounted row -- the thing
 * that made a large crew feel sluggish. Only the fields actually drawn are
 * compared.
 */
export default React.memo(AttendanceRow, (prev, next) => {
  const a = prev.row;
  const b = next.row;

  return (
    a.labour._id === b.labour._id &&
    a.punchIn === b.punchIn &&
    a.punchOut === b.punchOut &&
    a.workingHours === b.workingHours &&
    a.editable === b.editable &&
    prev.onChange === next.onChange &&
    prev.onRemove === next.onRemove
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EEF1F5",
  },

  rowLocked: {
    backgroundColor: "#F8FAFC",
  },

  identity: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  meta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  // Wide enough to hold "09:00" once set, so the row doesn't reflow the moment
  // a time is chosen.
  punch: {
    minWidth: 52,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  punchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  punchInSet: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  punchInSetText: {
    color: "#15803D",
  },

  punchOutSet: {
    backgroundColor: "#E0E7FF",
    borderColor: "#4F46E5",
  },

  punchOutSetText: {
    color: "#3730A3",
  },

  punchDisabled: {
    opacity: 0.45,
  },

  punchDisabledText: {
    color: "#C4C9D2",
  },

  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    height: 34,
  },

  lockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
