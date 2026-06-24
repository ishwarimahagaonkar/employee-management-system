# employee-management-system

A full-stack Employee Management System built using React Native (Expo), Node.js, Express.js, and MongoDB. The application enables organizations to manage employee attendance, payroll, salary slips, leave requests, and employee profiles through a mobile application.

## PRIMARY Problem

- Admin spends hours every month calculating salary from attendance, overtime ,travel and penalties
    
    “General payroll in one click!!!!!”

## 🚀 Features

### Authentication
- Secure Login System
- JWT Authentication
- Protected Routes
- Role-Based Access Control

### Attendance Management
- Employee Check-In & Check-Out
- Monthly Attendance Tracking
- Attendance History
- Working Hours Calculation
- GPS-Based Attendance Validation

### Employee Dashboard
- Attendance Summary
- Employee Profile
- Monthly Attendance Report
- Leave Management

### Payroll Management
- Automated Salary Calculation
- Payroll Generation and pdf generation
- Salary Slip Management

### Leave Management
- Apply for Leave
- Track Leave Status
- View Leave History

---

## Tech Stack
# Frontend (Mobile App)
    React Native + Expo
# Backend
    Node.js + Express.js
# Database
    MongoDB
    Mongoose
# Additional Services
    Location Services
    Async Storage
    REST APIs

## PROJECT STRUCTURE
```text
EMPLOYEE-MANAGEMENT-SYSTEM
│
├── backend
│   ├── src
│   │   ├── config
│   │   │   ├── db.js
│   │   │   └── location.js
│   │   │
│   │   ├── controllers
│   │   │   ├── attendanceController.js
│   │   │   ├── authController.js
│   │   │   ├── employeeController.js
│   │   │   ├── payrollController.js
│   │   │   └── salarySlipController.js
│   │   │
│   │   ├── middleware
│   │   │   └── authMiddleware.js
│   │   │
│   │   ├── models
│   │   │   ├── Attendance.js
│   │   │   └── User.js
│   │   │
│   │   ├── routes
│   │   │   ├── attendanceRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── employeeRoutes.js
│   │   │   ├── payrollRoutes.js
│   │   │   ├── salarySlipRoutes.js
│   │   │   └── testRoutes.js
│   │   │
│   │   └── utils
│   │       ├── locationCheck.js
│   │       ├── salaryCalculator.js
│   │       └── timeCalculator.js
│   ├── .env
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── employee-mobile
│   ├── src
│   │   ├── api
│   │   │    └──api.js
│   │   ├── context
│   │   │    └──AuthContext.js
│   │   ├── navigation
│   │   │    └──AppNAvigation.js
│   │   └── screens
│   │       ├── admin
│   │       ├── auth
│   │       └── employee
│   │           ├── AttendanceCard.js
│   │           ├── AttendanceScreen.js
│   │           ├── BottomTabNavigator.js
│   │           ├── EmployeeDashboard.js
│   │           ├── LeaveScreen.js
│   │           ├── MonthlyAttendance.js
│   │           ├── ProfileScreen.js
│   │           └── TravelScreen.js
│   │
│   ├── App.js
│   ├── app.json
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```
## API MODULES

### Authentication Module
- User Login
- JWT Token Generation
- Protected APIs

### Attendance Module
- Check-In
- Check-Out
- Attendance History
- Monthly Attendance Tracking

### Employee Module
- Employee Profile
- Employee Dashboard
- Attendance Summary

### Payroll Module
- Salary Calculation
- Payroll Processing
- Salary Breakdown

### Salary Slip Module
- Salary Slip Generation
- Monthly Salary Reports

### Leave Module
- Leave Requests
- Leave Tracking

##  Attendance Workflow

```text
Employee Login
      ↓
Location Verification
      ↓
Check-In
      ↓
Work Session
      ↓
Check-Out
      ↓
Working Hours Calculation
      ↓
Attendance Record Saved
```

---

## 💰 Payroll Workflow

```text
Attendance Records
      ↓
Working Hours Calculation
      ↓
Salary Calculation
      ↓
Payroll Generation
      ↓
Salary Slip Creation
```

## 🔒 Security Features

- JWT Authentication
- Protected Routes
- Middleware-Based Authorization
- Secure API Access
- Location-Based Attendance Validation

---
## 🎯 Future Enhancements

- Push Notifications
- Face Recognition Attendance
- Admin Analytics Dashboard
- Leave Approval Workflow
- Multi-Branch Support
---

## 👩‍💻 Author

**Ishwari**

Full Stack Developer 

---

## ⭐ Support

If you found this project helpful, please consider giving it a Star on GitHub.