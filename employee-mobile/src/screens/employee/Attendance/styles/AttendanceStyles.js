import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  headerCard: {
    backgroundColor: "#112250",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  heading: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 25,
  },

  locationContainer: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 24,
    padding: 20,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  locationTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  locationSubTitle: {
    color: "#E6E6FA",
    fontSize: 13,
  },

  mapPlaceholder: {
    height: 150,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  processingText: {
    color: "#ffffffb7",
    fontSize: 13,
    marginTop: 8,
  },

  punchButton: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },

  punchLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  punchText: {
    color: "#112250",
    fontWeight: "700",
    fontSize: 18,
  },

  summaryCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  statItem: {
    alignItems: "center",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 10,
  },

  navigateIcon: {
    paddingBottom: 10,
    paddingRight: 10,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },

  statLabel: {
    color: "#666",
    marginTop: 4,
  },

  historyTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginHorizontal: 20,
    marginBottom: 15,
  },

  historyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  calendarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1EEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  dateText: {
    fontSize: 16,
    fontWeight: "600",
  },

  dayText: {
    color: "#777",
    marginTop: 2,
  },

  presentBadge: {
    backgroundColor: "#ECEAFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  badgeText: {
    color: "#112250",
    fontWeight: "600",
  },
});

export default styles;