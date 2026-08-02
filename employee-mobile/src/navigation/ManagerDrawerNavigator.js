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

const ITEMS = [
  { name: "Dashboard", label: "Dashboard", icon: "grid-outline", component: DashboardRoute },
  { name: "MyWork", label: "My Work", icon: "person-outline", component: MyWorkRoute },
  { name: "Employees", label: "Employees", icon: "people-outline", component: EmployeesRoute },
  { name: "Attendance", label: "Attendance", icon: "time-outline", component: AttendanceRoute },
  { name: "Leave", label: "Leave", icon: "calendar-outline", component: LeaveRoute },
  { name: "Sites", label: "Sites", icon: "business-outline", component: SitesRoute },
  { name: "Labour", label: "Labour", icon: "people-circle-outline", component: LabourRoute },
  {
    name: "DailyWorkReport",
    label: "Daily Reports",
    icon: "create-outline",
    component: DailyWorkReportRoute,
  },
  {
    name: "LabourReports",
    label: "Labour Reports",
    icon: "clipboard-outline",
    component: LabourReportsRoute,
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
