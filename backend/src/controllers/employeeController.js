const User = require("../models/User");
const bcrypt = require("bcryptjs");


// ==========================
// CREATE EMPLOYEE (ADMIN)
// ==========================
exports.createEmployee = async (req, res) => {
    try {
        const { fullName, email, password, department, designation } = req.body;

        // Validation
        if (!fullName || !email || !password || !department || !designation) {
            return res.status(400).json({
                message: "All fields are required",
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
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            role: "employee",
            department,
            designation,
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
        const employees = await User.find({ role: "employee" })
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
// GET EMPLOYEE BY ID
// ==========================
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id).select("-password");

        if (!employee || employee.role !== "employee") {
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

        if (!employee || employee.role !== "employee") {
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

        if (!employee || employee.role !== "employee") {
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