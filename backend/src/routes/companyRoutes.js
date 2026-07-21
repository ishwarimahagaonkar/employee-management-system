const express = require("express");

const {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    updateSubscription,
    deleteCompany,
} = require("../controllers/companyController");

const { protect, superAdminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * COMPANY MANAGEMENT ROUTES (SUPER ADMIN ONLY)
 */

// Create company (+ its first admin)
router.post("/", protect, superAdminOnly, createCompany);

// Get all companies
router.get("/", protect, superAdminOnly, getAllCompanies);

// Get single company
router.get("/:id", protect, superAdminOnly, getCompanyById);

// Update company profile
router.put("/:id", protect, superAdminOnly, updateCompany);

// Update subscription
router.put("/:id/subscription", protect, superAdminOnly, updateSubscription);

// Delete company
router.delete("/:id", protect, superAdminOnly, deleteCompany);

module.exports = router;
