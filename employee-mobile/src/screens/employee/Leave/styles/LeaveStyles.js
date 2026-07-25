import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  historySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  historyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  historyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
  },

  historyCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#9CA3AF",
  },
});

export default styles;
