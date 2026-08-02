const express = require("express");

const {
    createEmployee,
    getAllEmployees,
    getMyProfile,
    getColleagues,
    getEmployeeById,
    updateEmployee,
    updateEmployeeRole,
    resetEmployeePassword,
    deleteEmployee,
} = require("../controllers/employeeController");

const { protect, adminOnly, requirePermission } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * USER MANAGEMENT ROUTES
 *
 * Guarded by permission rather than a hardcoded role so managers can build
 * their own team (see config/roles.js). Which accounts a manager may actually
 * touch is narrowed again inside the controller: a manager only ever reaches
 * supervisors and employees, never another manager or an admin.
 *
 * Deleting stays admin-only -- it erases attendance, leave and travel history.
 */

// Create employee
router.post("/", protect, requirePermission("employee:create"), createEmployee);

// Get all employees
router.get("/", protect, requirePermission("employee:view"), getAllEmployees);

// Get logged-in employee's own profile
router.get("/me", protect, getMyProfile);

// Get same-company colleagues (for co-traveler selection). Must be declared
// before "/:id" so it isn't captured by the param route.
router.get("/colleagues", protect, getColleagues);

// Get single employee
router.get("/:id", protect, requirePermission("employee:view"), getEmployeeById);

// Update employee
router.put("/:id", protect, requirePermission("employee:edit"), updateEmployee);

// Change a user's role. Separate from the update route so a profile save can
// never carry a privilege escalation with it.
router.patch("/:id/role", protect, requirePermission("role:assign"), updateEmployeeRole);

// Reset an employee's password
router.patch("/:id/password", protect, requirePermission("employee:edit"), resetEmployeePassword);

// Delete employee (admin only -- this also erases their records)
router.delete("/:id", protect, adminOnly, deleteEmployee);

module.exports = router;
