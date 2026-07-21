const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");

// Compares two companyId values (handles null/undefined/ObjectId uniformly)
const sameCompany = (a, b) => String(a ?? null) === String(b ?? null);


// ==========================
// CREATE EMPLOYEE (ADMIN)
// ==========================
exports.createEmployee = async (req, res) => {
    try {
        const { empID, fullName, email, password, department, designation, role } = req.body;

        // Validation
        if (!empID || !fullName || !email || !password || !department || !designation) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        if (role && !["employee", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either 'employee' or 'admin'",
            });
        }

        const normalizedEmail = email.toLowerCase();

        // Check duplicate
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "Employee already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create employee
        const employee = await User.create({
            empID,
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || "employee",
            department,
            designation,
            companyId: req.user.companyId,
        });

        // Remove password before sending response
        const employeeObj = employee.toObject();
        delete employeeObj.password;

        return res.status(201).json({
            message: "Employee created successfully",
            employee: employeeObj,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// GET ALL EMPLOYEES (ADMIN)
// ==========================
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: "employee", companyId: req.user.companyId })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: employees.length,
            employees,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// GET MY PROFILE (LOGGED-IN EMPLOYEE)
// ==========================
exports.getMyProfile = async (req, res) => {
    try {
        let company = null;

        if (req.user.companyId) {
            company = await Company.findById(req.user.companyId).select("subscription.plan");
        }

        const userResponse = {
            ...req.user.toObject(),
            company: company ? { plan: company.subscription.plan } : null,
        };

        return res.status(200).json(userResponse);

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// GET EMPLOYEE BY ID
// ==========================
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id).select("-password");

        if (!employee || employee.role !== "employee" || !sameCompany(employee.companyId, req.user.companyId)) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        return res.status(200).json(employee);

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// UPDATE EMPLOYEE
// ==========================
exports.updateEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);

        if (!employee || employee.role !== "employee" || !sameCompany(employee.companyId, req.user.companyId)) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        // Prevent role overwrite (security)
        if (req.body.role) {
            delete req.body.role;
        }

        const updatedEmployee = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).select("-password");

        return res.status(200).json({
            message: "Employee updated successfully",
            employee: updatedEmployee,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};


// ==========================
// DELETE EMPLOYEE
// ==========================
exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);

        if (!employee || employee.role !== "employee" || !sameCompany(employee.companyId, req.user.companyId)) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        await User.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Employee deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};