// Single source of truth for the role hierarchy and what each role may do.
//
// ADMIN -> MANAGER -> SUPERVISOR -> EMPLOYEE
//
// LABOUR is deliberately absent: labour is tracked for attendance only, never
// logs in, and therefore has no role here (see the Labour model).
//
// SUPERADMIN also sits outside this matrix on purpose. It operates across
// companies and carries no companyId, so it must not inherit company-scoped
// permissions -- those all assume a company to scope the query to. Super admin
// access stays gated by superAdminOnly, exactly as before.

const ROLES = {
    SUPERADMIN: "superadmin",
    ADMIN: "admin",
    MANAGER: "manager",
    SUPERVISOR: "supervisor",
    EMPLOYEE: "employee",
};

// Every role that owns a login, highest authority first.
const ALL_ROLES = [
    ROLES.SUPERADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.EMPLOYEE,
];

// Roles that live inside a company (i.e. everything except super admin).
const COMPANY_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.EMPLOYEE];

// Roles that consume a seat against Company.subscription.employeeLimit.
// Admin is excluded, matching how admins have always been free of the limit.
const SEAT_ROLES = [ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.EMPLOYEE];

// Roles that behave like staff: they punch, travel and take leave for
// themselves. Admin is excluded -- an admin administers, it does not attend.
const STAFF_ROLES = [ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.EMPLOYEE];

// permission -> roles allowed to exercise it.
//
// Read this as the contract that both the API guards and the mobile menus
// follow, so a hidden button and a rejected request can never disagree.
const PERMISSIONS = {
    // --- Own staff record (Admin intentionally absent) ---
    "attendance:self": STAFF_ROLES,
    "travel:self": STAFF_ROLES,
    "leave:apply": STAFF_ROLES,

    // --- People management ---
    "employee:view": [ROLES.ADMIN, ROLES.MANAGER],
    "employee:create": [ROLES.ADMIN, ROLES.MANAGER],
    "employee:edit": [ROLES.ADMIN, ROLES.MANAGER],
    "employee:delete": [ROLES.ADMIN],
    "role:assign": [ROLES.ADMIN, ROLES.MANAGER],

    // --- Approvals and oversight ---
    "leave:approve": [ROLES.ADMIN, ROLES.MANAGER],
    "attendance:viewAll": [ROLES.ADMIN, ROLES.MANAGER],
    "travel:viewAll": [ROLES.ADMIN, ROLES.MANAGER],
    "report:company": [ROLES.ADMIN, ROLES.MANAGER],

    // --- Admin-only company configuration ---
    "payroll:access": [ROLES.ADMIN],
    "settings:manage": [ROLES.ADMIN],
    "holiday:manage": [ROLES.ADMIN],

    // --- Sites (supervisor creates; admin and manager oversee) ---
    "site:view": [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    "site:create": [ROLES.SUPERVISOR],
    "site:manage": [ROLES.ADMIN, ROLES.MANAGER],

    // --- Labour ---
    "labour:view": [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    "labour:manage": [ROLES.ADMIN, ROLES.SUPERVISOR],
    // Supervisors mark the daily sheet. Admin is included so a mistake found
    // after the supervisor's same-day edit window closes can still be fixed;
    // without it a typo would be permanent.
    "labour:attendance": [ROLES.ADMIN, ROLES.SUPERVISOR],
    "labour:report": [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],

    // --- Supervisor daily work update ---
    // Supervisors file the report. Admin is included for the same reason as
    // labour:attendance: the supervisor's edit window closes at the end of the
    // day, so without this a mistake spotted tomorrow could never be fixed.
    // Managers deliberately stay read-only here.
    "dailyReport:submit": [ROLES.ADMIN, ROLES.SUPERVISOR],
    "dailyReport:view": [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
};

/**
 * Whether a role holds a permission. Unknown roles and unknown permissions are
 * denied rather than defaulting open.
 */
function can(role, permission) {
    const allowed = PERMISSIONS[permission];
    return Array.isArray(allowed) && allowed.includes(role);
}

/**
 * The roles this role may hand out. A manager may build a team but must never
 * be able to mint peers or admins (Feature 3: "Manager CANNOT create another
 * Manager / create Admin").
 */
function assignableRolesFor(role) {
    if (role === ROLES.ADMIN) {
        return [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.EMPLOYEE];
    }
    if (role === ROLES.MANAGER) {
        return [ROLES.SUPERVISOR, ROLES.EMPLOYEE];
    }
    return [];
}

// Staff roles punch, travel and take leave; admins do not.
function isStaffRole(role) {
    return STAFF_ROLES.includes(role);
}

// Counts against the company's subscription seat limit.
function consumesSeat(role) {
    return SEAT_ROLES.includes(role);
}

module.exports = {
    ROLES,
    ALL_ROLES,
    COMPANY_ROLES,
    SEAT_ROLES,
    STAFF_ROLES,
    PERMISSIONS,
    can,
    assignableRolesFor,
    isStaffRole,
    consumesSeat,
};
