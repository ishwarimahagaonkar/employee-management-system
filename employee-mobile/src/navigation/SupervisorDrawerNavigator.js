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

// A supervisor has the same staff rights as an employee -- punch in/out,
// travel, leave -- plus the site and labour tools, so "My Work" is the
// employee tab bar and the labour screens sit below it.

const DashboardRoute = withErrorBoundary(SupervisorDashboard, "Dashboard");
const MyWorkRoute = withErrorBoundary(BottomTabNavigator, "My Work");
const SitesRoute = withErrorBoundary(SitesScreen, "My Sites");
const LabourRoute = withErrorBoundary(LabourScreen, "Labour");
const LabourAttendanceRoute = withErrorBoundary(LabourAttendanceScreen, "Labour Attendance");
const DailyWorkReportRoute = withErrorBoundary(DailyWorkReportScreen, "Daily Work Report");
const LabourReportsRoute = withErrorBoundary(LabourReportScreen, "Labour Reports");

const ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline", component: DashboardRoute },
  { name: "MyWork", label: "My Work", icon: "person-outline", component: MyWorkRoute },
  { name: "Sites", label: "My Sites", icon: "business-outline", component: SitesRoute },
  { name: "Labour", label: "Labour", icon: "people-outline", component: LabourRoute },
  {
    name: "LabourAttendance",
    label: "Labour Attendance",
    icon: "time-outline",
    component: LabourAttendanceRoute,
  },
  {
    name: "DailyWorkReport",
    label: "Daily Work Report",
    icon: "create-outline",
    component: DailyWorkReportRoute,
  },
  {
    name: "LabourReports",
    label: "Labour Reports",
    icon: "clipboard-outline",
    component: LabourReportsRoute,
  },
];

export default function SupervisorDrawerNavigator() {
  return <RoleDrawerNavigator roleLabel="Supervisor" items={ITEMS} />;
}
