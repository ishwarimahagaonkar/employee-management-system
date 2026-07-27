const User = require("../models/User");
const Company = require("../models/Company");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Travel = require("../models/Travel");
const bcrypt = require("bcryptjs");
const { getPagination } = require("../utils/pagination");
const { validatePassword, isValidEmail } = require("../utils/validators");
const { deletePunchPhotos } = require("../utils/photoStorage");

// Compares two companyId values (handles null/undefined/ObjectId uniformly)
const sameCompany = (a, b) => String(a ?? null) === String(b ?? null);


// ==========================
// CREATE EMPLOYEE (ADMIN)
// ==========================
exports.createEmployee = async (req, res) => {
    try {
        const { empID, fullName, email, password, department, designation, role, hourlyRate } = req.body;
        // Accept either casing from clients.
        const joiningDate = req.body.joiningDate || req.body.JoiningDate;

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

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        if (hourlyRate !== undefined && (isNaN(hourlyRate) || Number(hourlyRate) < 0)) {
            return res.status(400).json({ message: "Hourly rate must be a non-negative number" });
        }

        const normalizedEmail = email.toLowerCase();
        const companyId = req.user.companyId;

        // Email is a global login identifier -> must be unique across the system.
        const emailTaken = await User.findOne({ email: normalizedEmail });
        if (emailTaken) {
            return res.status(409).json({
                message: "A user with this email already exists",
            });
        }

        // empID only needs to be unique WITHIN the company (companies may each
        // reuse ids like "EMP001").
        const empIdTaken = await User.findOne({ empID, companyId: companyId ?? null });
        if (empIdTaken) {
            return res.status(409).json({
                message: "An employee with this ID already exists in your company",
            });
        }

        // Enforce the company's subscription seat limit.
        if (companyId) {
            const company = await Company.findById(companyId).select("subscription.employeeLimit");
            const limit = company?.subscription?.employeeLimit;
            if (limit) {
                const employeeCount = await User.countDocuments({ role: "employee", companyId });
                if (employeeCount >= limit) {
                    return res.status(403).json({
                        message: `Employee limit reached for your plan (${limit}). Upgrade your plan to add more.`,
                    });
                }
            }
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
            joiningDate,
            hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : 0,
            companyId,
        });

        // Remove password before sending response
        const employeeObj = employee.toObject();
        delete employeeObj.password;

        return res.status(201).json({
            message: "Employee created successfully",
            employee: employeeObj,
        });

    } catch (error) {
        // Duplicate key (unique index) -> conflict, not a server error.
        if (error.code === 11000) {
            return res.status(409).json({ message: "Employee ID or email already exists" });
        }
        console.error("createEmployee error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET ALL EMPLOYEES (ADMIN)
// ==========================
exports.getAllEmployees = async (req, res) => {
    try {
        const filter = { role: "employee", companyId: req.user.companyId };
        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = User.find(filter).select("-password").sort({ createdAt: -1 });
        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [employees, total] = await Promise.all([
            queryBuilder,
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            count: employees.length,
            total,
            page: paginate ? page : 1,
            employees,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
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
            message: "Server error",
        });
    }
};


// ==========================
// GET COLLEAGUES (any logged-in user, same company)
// Minimal list used for picking co-travelers on a trip.
// ==========================
exports.getColleagues = async (req, res) => {
    try {
        const colleagues = await User.find({
            companyId: req.user.companyId ?? null,
            role: { $in: ["employee", "admin"] },
            isActive: { $ne: false },
            _id: { $ne: req.user._id },
        })
            .select("empID fullName department designation")
            .sort({ fullName: 1 });

        return res.status(200).json({
            count: colleagues.length,
            colleagues,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
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
            message: "Server error",
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

        // Never let the update body tamper with auth-critical fields directly.
        delete req.body.password;
        delete req.body.tokenVersion;
        delete req.body.companyId;

        if (req.body.hourlyRate !== undefined && (isNaN(req.body.hourlyRate) || Number(req.body.hourlyRate) < 0)) {
            return res.status(400).json({ message: "Hourly rate must be a non-negative number" });
        }

        // Normalize joining-date key casing so it maps to the schema field.
        if (req.body.JoiningDate !== undefined) {
            req.body.joiningDate = req.body.JoiningDate;
            delete req.body.JoiningDate;
        }

        // Deactivating an employee must immediately kill their live sessions.
        if (req.body.isActive === false && employee.isActive !== false) {
            req.body.tokenVersion = (employee.tokenVersion ?? 0) + 1;
        }

        const updatedEmployee = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(200).json({
            message: "Employee updated successfully",
            employee: updatedEmployee,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// RESET EMPLOYEE PASSWORD (ADMIN)
// ==========================
exports.resetEmployeePassword = async (req, res) => {
    try {
        const { password } = req.body;

        const employee = await User.findById(req.params.id);

        if (!employee || employee.role !== "employee" || !sameCompany(employee.companyId, req.user.companyId)) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        employee.password = await bcrypt.hash(password, 10);
        // Invalidate the employee's existing sessions after a password reset.
        employee.tokenVersion = (employee.tokenVersion ?? 0) + 1;
        await employee.save();

        return res.status(200).json({
            message: "Password reset successfully",
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
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

        // Remove the punch photo files before the records that reference
        // them, otherwise the images are orphaned on disk forever.
        const photoRows = await Attendance.find({ userId: req.params.id })
            .select("punchInPhoto punchOutPhoto")
            .lean();
        deletePunchPhotos(photoRows.flatMap((r) => [r.punchInPhoto, r.punchOutPhoto]));

        // Cascade: remove the employee's own records so no orphans are left
        // pointing at a deleted user.
        await Promise.all([
            Attendance.deleteMany({ userId: req.params.id }),
            Leave.deleteMany({ userId: req.params.id }),
            Travel.deleteMany({ userId: req.params.id }),
        ]);

        await User.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Employee deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};