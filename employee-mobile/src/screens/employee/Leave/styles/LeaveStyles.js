import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  /* ================= HEADER ================= */
  headerCard: {
    backgroundColor: "#6C63FF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
  },

  applyBtn: {
    marginTop: 18,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  applyText: {
    color: "#6C63FF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ================= SUMMARY ================= */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },

  card: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
  },

  count: {
    fontSize: 26,
    fontWeight: "700",
    color: "#6C63FF",
  },

  cardLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  /* ================= FORM ================= */
  form: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#222",
  },

  typeRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
  },

  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  active: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },

  input: {
    backgroundColor: "#F8F8FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#333",
  },

  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ================= HISTORY ================= */
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 15,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  leaveType: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  date: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },

  reasonBox: {
    marginTop: 10,
    backgroundColor: "#F6F7FB",
    padding: 12,
    borderRadius: 12,
  },

  reasonLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginBottom: 4,
  },

  reasonText: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },

  cancelBtn: {
    marginTop: 14,
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default styles;