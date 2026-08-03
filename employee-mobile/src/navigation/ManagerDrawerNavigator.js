import React from "react";

import RoleDrawerNavigator from "./RoleDrawerNavigator";
import { withErrorBoundary } from "../components/ErrorBoundary";

import ManagerDashboard from "../screens/labour/ManagerDashboard";
import BottomTabNavigator from "../screens/employee/BottomTabNavigator";
import EmployeesScreen from "../screens/admin/Employees/EmployeesScreen";
import AttendanceScreen from "../screens/admin/Attendance/AttendanceScreen";
import LeaveScreen from "../screens/admin/Leave/LeaveScreen";
import ReportScreen from "../screens/admin/Report/ReportScreen";
import SitesScreen from "../screens/sites/SitesScreen";
import LabourScreen from "../screens/labour/LabourScreen";
import DailyWorkReportScreen from "../screens/labour/DailyWorkReportScreen";
import LabourReportScreen from "../screens/labour/LabourReportScreen";
import PlaceholderScreen from "../screens/admin/components/PlaceholderScreen";
import { FEATURES } from "../config/features";

// A manager is an employee plus management rights, so "My Work" is the same
// tab bar an employee gets -- punch in/out, travel, leave, profile -- and the
// management screens sit below it.
//
// Settings and Holidays are absent on purpose: those are company-wide
// configuration and stay Admin-only.
//
// Labour reporting is read-only for a manager: they can generate and export
// reports, but filing daily reports and marking attendance stay with the
// supervisor who was actually on site.

const DashboardRoute = withErrorBoundary(ManagerDashboard, "Dashboard");
const MyWorkRoute = withErrorBoundary(BottomTabNavigator, "My Work");
const EmployeesRoute = withErrorBoundary(EmployeesScreen, "Employees");
const AttendanceRoute = withErrorBoundary(AttendanceScreen, "Attendance");
const LeaveRoute = withErrorBoundary(LeaveScreen, "Leave");
const ReportRoute = withErrorBoundary(ReportScreen, "Report");
const SitesRoute = withErrorBoundary(SitesScreen, "Sites");
const LabourRoute = withErrorBoundary(LabourScreen, "Labour");
const DailyWorkReportRoute = withErrorBoundary(DailyWorkReportScreen, "Daily Reports");
const LabourReportsRoute = withErrorBoundary(LabourReportScreen, "Labour Reports");
const ComingSoonRoute = withErrorBoundary(PlaceholderScreen, "Coming Soon");

// Real screen when the feature is on, "Coming Soon" when it isn't.
const gated = (component, title, icon) =>
  FEATURES.labourManagement
    ? { component }
    : { component: ComingSoonRoute, initialParams: { title, icon } };

const ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline", component: DashboardRoute },
  { name: "MyWork", label: "My Work", icon: "person-outline", component: MyWorkRoute },
  { name: "Employees", label: "Employees", icon: "people-outline", component: EmployeesRoute },
  { name: "Attendance", label: "Attendance", icon: "time-outline", component: AttendanceRoute },
  { name: "Leave", label: "Leave", icon: "calendar-outline", component: LeaveRoute },
  {
    name: "Sites",
    label: "Sites",
    icon: "business-outline",
    ...gated(SitesRoute, "Sites", "business-outline"),
  },
  {
    name: "Labour",
    label: "Labour",
    icon: "people-circle-outline",
    ...gated(LabourRoute, "Labour", "people-circle-outline"),
  },
  {
    name: "DailyWorkReport",
    label: "Daily Reports",
    icon: "create-outline",
    ...gated(DailyWorkReportRoute, "Daily Reports", "create-outline"),
  },
  {
    name: "LabourReports",
    label: "Labour Reports",
    icon: "clipboard-outline",
    ...gated(LabourReportsRoute, "Labour Reports", "clipboard-outline"),
  },
  {
    name: "Report",
    label: "Report",
    icon: "document-text-outline",
    component: ReportRoute,
    premiumOnly: true,
  },
];

export default function ManagerDrawerNavigator() {
  return <RoleDrawerNavigator roleLabel="Manager" items={ITEMS} />;
}
