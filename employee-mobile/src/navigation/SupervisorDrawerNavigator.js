import React from "react";

import RoleDrawerNavigator from "./RoleDrawerNavigator";
import { withErrorBoundary } from "../components/ErrorBoundary";

import SupervisorDashboard from "../screens/labour/SupervisorDashboard";
import BottomTabNavigator from "../screens/employee/BottomTabNavigator";
import SitesScreen from "../screens/sites/SitesScreen";
import LabourScreen from "../screens/labour/LabourScreen";
import LabourAttendanceScreen from "../screens/labour/LabourAttendanceScreen";
import DailyWorkReportScreen from "../screens/labour/DailyWorkReportScreen";
import LabourReportScreen from "../screens/labour/LabourReportScreen";
import PlaceholderScreen from "../screens/admin/components/PlaceholderScreen";
import { FEATURES } from "../config/features";

// A supervisor has the same staff rights as an employee -- punch in/out,
// travel, leave -- plus the site and labour tools, so "My Work" is the
// employee tab bar and the labour screens sit below it.
//
// The labour screens are behind FEATURES.labourManagement. The imports above
// stay because the screens are still built and tested -- only the route they
// resolve to changes.

const DashboardRoute = withErrorBoundary(SupervisorDashboard, "Dashboard");
const MyWorkRoute = withErrorBoundary(BottomTabNavigator, "My Work");
const SitesRoute = withErrorBoundary(SitesScreen, "My Sites");
const LabourRoute = withErrorBoundary(LabourScreen, "Labour");
const LabourAttendanceRoute = withErrorBoundary(LabourAttendanceScreen, "Labour Attendance");
const DailyWorkReportRoute = withErrorBoundary(DailyWorkReportScreen, "Daily Work Report");
const LabourReportsRoute = withErrorBoundary(LabourReportScreen, "Labour Reports");
const ComingSoonRoute = withErrorBoundary(PlaceholderScreen, "Coming Soon");

// Routes to the real screen when the feature is on, and to "Coming Soon"
// when it isn't -- keeping the menu shape stable either way.
const gated = (component, title, icon) =>
  FEATURES.labourManagement
    ? { component }
    : { component: ComingSoonRoute, initialParams: { title, icon } };

const ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline", component: DashboardRoute },
  { name: "MyWork", label: "My Work", icon: "person-outline", component: MyWorkRoute },
  {
    name: "Sites",
    label: "My Sites",
    icon: "business-outline",
    ...gated(SitesRoute, "My Sites", "business-outline"),
  },
  {
    name: "Labour",
    label: "Labour",
    icon: "people-outline",
    ...gated(LabourRoute, "Labour", "people-outline"),
  },
  {
    name: "LabourAttendance",
    label: "Labour Attendance",
    icon: "time-outline",
    ...gated(LabourAttendanceRoute, "Labour Attendance", "time-outline"),
  },
  {
    name: "DailyWorkReport",
    label: "Daily Work Report",
    icon: "create-outline",
    ...gated(DailyWorkReportRoute, "Daily Work Report", "create-outline"),
  },
  {
    name: "LabourReports",
    label: "Labour Reports",
    icon: "clipboard-outline",
    ...gated(LabourReportsRoute, "Labour Reports", "clipboard-outline"),
  },
];

export default function SupervisorDrawerNavigator() {
  return <RoleDrawerNavigator roleLabel="Supervisor" items={ITEMS} />;
}
