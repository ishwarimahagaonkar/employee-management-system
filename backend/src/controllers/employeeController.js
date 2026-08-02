const User = require("../models/User");
const Company = require("../models/Company");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Travel = require("../models/Travel");
const bcrypt = require("bcryptjs");
const { getPagination } = require("../utils/pagination");
const { validatePassword, isValidEmail } = require("../utils/validators");
const { deletePunchPhotos } = require("../utils/photoStorage");
const {
    ROLES,
    COMPANY_ROLES,
    SEAT_ROLES,
    STAFF_ROLES,
    assignableRolesFor,
    consumesSeat,
} = require("../config/roles");

// Compares two companyId values (handles null/undefined/ObjectId uniformly)
const sameCompany = (a, b) => String(a ?? null) === String(b ?? null);


// Which roles an actor may view and edit inside their own company.
// Super admin is absent from COMPANY_ROLES, so it is never manageable here --
// that account is only reachable through the super-admin routes.
const manageableRolesFor = (actorRole) => {
    if (actorRole === ROLES.ADMIN) return COMPANY_ROLES;
    if (actorRole === ROLES.MANAGER) return [ROLES.SUPERVISOR, ROLES.EMPLOYEE];
    return [];
};


/**
 * Loads a user the actor is allowed to act on, or null when the target
 * doesn't exist, sits in another company, or outranks the actor. Callers
 * answer all three cases with the same 404 so this can't be used to probe
 * for accounts.
 */
const findManageableUser = async (id, actor) => {
    let target;

    try {
        target = await User.findById(id);
    } catch (error) {
        // Malformed ObjectId -- same answer as "not found".
        return null;
    }

    if (!target) return null;
    if (!sameCompany(target.companyId, actor.companyId)) return null;
    if (!manageableRolesFor(actor.role).includes(target.role)) return null;

    return target;
};


// A company must never be left without a way in. Blocks demoting, deleting or
// deactivating its only remaining active admin.
const isLastActiveAdmin = async (user) => {
    if (user.role !== ROLES.ADMIN) return false;

    const otherAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: ROLES.ADMIN,
        companyId: user.companyId ?? null,
        isActive: { $ne: false },
    });

    return otherAdmins === 0;
};


/**
 * Returns an error message when adding one more seat-consuming account would
 * break the company's plan, or null when there's room. Managers and
 * supervisors now count alongside employees -- otherwise the limit could be
 * sidestepped by creating everyone as a manager.
 */
const seatLimitError = async (companyId, incomingRole, excludeUserId) => {
    if (!companyId || !consumesSeat(incomingRole)) return null;

    const company = await Company.findById(companyId).select("subscription.employeeLimit");
    const limit = company?.subscription?.employeeLimit;
    if (!limit) return null;

    const filter = { role: { $in: SEAT_ROLES }, companyId };
    if (excludeUserId) filter._id = { $ne: excludeUserId };

    const seatsUsed = await User.countDocuments(filter);

    return seatsUsed >= limit
        ? `Employee limit reached for your plan (${limit}). Upgrade your plan to add more.`
        : null;
};


/**
 * Validates an incoming managerId. Returns { error } or { value }, where value
 * is an ObjectId, null (explicitly cleared) or undefined (not supplied).
 */
const resolveManagerId = async (rawId, companyId) => {
    if (rawId === undefined) return { value: undefined };
    if (rawId === null || rawId === "") return { value: null };

    const manager = await User.findOne({
        _id: String(rawId),
        companyId: companyId ?? null,
        role: { $in: [ROLES.ADMIN, ROLES.MANAGER] },
        isActive: { $ne: false },
    }).select("_id").catch(() => null);

    return manager
        ? { value: manager._id }
        : { error: "Assigned manager must be an active admin or manager in your company" };
};


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

        // An actor may only create roles it is allowed to hand out: an admin can
        // create any company role, a manager only supervisors and employees
        // (never another manager, never an admin).
        const allowedRoles = assignableRolesFor(req.user.role);

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${allowedRoles.join(", ")}`,
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

        const newRole = role || ROLES.EMPLOYEE;

        // Optional reporting line ("Assign Managers" / "Assign Supervisors").
        const manager = await resolveManagerId(req.body.managerId, companyId);
        if (manager.error) {
            return res.status(400).json({ message: manager.error });
        }

        // Enforce the company's subscription seat limit.
        const seatError = await seatLimitError(companyId, newRole);
        if (seatError) {
            return res.status(403).json({ message: seatError });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create employee
        const employee = await User.create({
            empID,
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            role: newRole,
            department,
            designation,
            joiningDate,
            hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : 0,
            managerId: manager.value ?? null,
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
        // Previously hard-filtered to role "employee", which made every admin
        // account invisible here and therefore impossible to edit or delete.
        // The list now covers whichever roles the caller is allowed to manage.
        const manageable = manageableRolesFor(req.user.role);

        const filter = {
            role: { $in: manageable },
            companyId: req.user.companyId,
        };

        // Optional ?role= filter, constrained to what the caller may see.
        if (req.query.role && manageable.includes(req.query.role)) {
            filter.role = req.query.role;
        }

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
        // Staff roles only: admins no longer travel, so they can't be picked as
        // co-travelers either.
        const colleagues = await User.find({
            companyId: req.user.companyId ?? null,
            role: { $in: STAFF_ROLES },
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
        const employee = await findManageableUser(req.params.id, req.user);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const employeeObj = employee.toObject();
        delete employeeObj.password;

        return res.status(200).json(employeeObj);

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
        const employee = await findManageableUser(req.params.id, req.user);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        // Prevent role overwrite (security). Role changes go through the
        // dedicated PATCH /:id/role route, which validates who may grant what;
        // letting a generic field update set it would bypass all of that.
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

        // managerId arrives through the same blanket update, so it has to be
        // checked here -- otherwise any ObjectId at all could be written to it.
        if (req.body.managerId !== undefined) {
            if (String(req.body.managerId) === String(employee._id)) {
                return res.status(400).json({ message: "A person can't report to themselves" });
            }

            const manager = await resolveManagerId(req.body.managerId, req.user.companyId);
            if (manager.error) {
                return res.status(400).json({ message: manager.error });
            }
            req.body.managerId = manager.value;
        }

        // Deactivating the only remaining admin would lock the company out.
        if (req.body.isActive === false && await isLastActiveAdmin(employee)) {
            return res.status(409).json({
                message: "This is the company's only active admin. Promote another admin first.",
            });
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

        const employee = await findManageableUser(req.params.id, req.user);

        if (!employee) {
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
// UPDATE A USER'S ROLE (ADMIN / MANAGER)
// ==========================
// Kept separate from updateEmployee on purpose: that route strips `role` from
// its body so a generic profile save can never escalate anyone. Every rule
// about who may grant what lives here.
//
// The change takes effect immediately -- the protect middleware re-reads the
// user on every request, so permissions follow the database, not the token.
// The session is deliberately NOT revoked: signing someone out mid-task would
// cost them whatever they were doing.
exports.updateEmployeeRole = async (req, res) => {
    try {
        const { role } = req.body;

        const allowedRoles = assignableRolesFor(req.user.role);

        if (typeof role !== "string" || !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${allowedRoles.join(", ")}`,
            });
        }

        const employee = await findManageableUser(req.params.id, req.user);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        // Changing your own role could remove your access mid-request, and is
        // the obvious route to self-promotion.
        if (String(employee._id) === String(req.user._id)) {
            return res.status(403).json({
                message: "You can't change your own role",
            });
        }

        if (employee.role === role) {
            const unchanged = employee.toObject();
            delete unchanged.password;

            return res.status(200).json({
                message: `${employee.fullName} is already a ${role}`,
                employee: unchanged,
            });
        }

        // Demoting the last admin would leave the company with no way in.
        if (await isLastActiveAdmin(employee)) {
            return res.status(409).json({
                message: "This is the company's only active admin. Promote another admin first.",
            });
        }

        // Only charge a seat when moving from a non-seat role (admin) into one.
        if (!consumesSeat(employee.role)) {
            const seatError = await seatLimitError(employee.companyId, role, employee._id);
            if (seatError) {
                return res.status(403).json({ message: seatError });
            }
        }

        const previousRole = employee.role;
        employee.role = role;
        await employee.save();

        const employeeObj = employee.toObject();
        delete employeeObj.password;

        return res.status(200).json({
            message: `${employee.fullName} is now a ${role}`,
            previousRole,
            employee: employeeObj,
        });

    } catch (error) {
        console.error("updateEmployeeRole error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// DELETE EMPLOYEE
// ==========================
exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await findManageableUser(req.params.id, req.user);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        // Deleting yourself removes your own access mid-request.
        if (String(employee._id) === String(req.user._id)) {
            return res.status(400).json({
                message: "You can't delete your own account",
            });
        }

        if (await isLastActiveAdmin(employee)) {
            return res.status(409).json({
                message: "This is the company's only active admin. Promote another admin first.",
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