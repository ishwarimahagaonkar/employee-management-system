const express = require("express");

const {
    createEmployee,
    getAllEmployees,
    getMyProfile,
    getColleagues,
    getEmployeeById,
    updateEmployee,
    resetEmployeePassword,
    deleteEmployee,
} = require("../controllers/employeeController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * EMPLOYEE MANAGEMENT ROUTES (ADMIN ONLY)
 */

// Create employee
router.post("/", protect, adminOnly, createEmployee);

// Get all employees
router.get("/", protect, adminOnly, getAllEmployees);

// Get logged-in employee's own profile
router.get("/me", protect, getMyProfile);

// Get same-company colleagues (for co-traveler selection). Must be declared
// before "/:id" so it isn't captured by the param route.
router.get("/colleagues", protect, getColleagues);

// Get single employee
router.get("/:id", protect, adminOnly, getEmployeeById);

// Update employee
router.put("/:id", protect, adminOnly, updateEmployee);

// Reset an employee's password
router.patch("/:id/password", protect, adminOnly, resetEmployeePassword);

// Delete employee
router.delete("/:id", protect, adminOnly, deleteEmployee);

module.exports = router;
