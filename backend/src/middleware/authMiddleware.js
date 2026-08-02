const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const { can, isStaffRole } = require("../config/roles");

// VERIFY TOKEN
exports.protect = async (req, res, next) => {
    try {
        let token;

        // CHECK TOKEN
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // NO TOKEN
        if (!token) {
            return res.status(401).json({
                message: "Not authorized, no token",
            });
        }

        // VERIFY TOKEN
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // FETCH USER FROM DATABASE (IMPORTANT FIX)
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                message: "User not found",
            });
        }

        // BLOCK DEACTIVATED ACCOUNTS
        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been deactivated. Contact your admin.",
            });
        }

        // REVOKE TOKENS ISSUED BEFORE THE LATEST logout / deactivation.
        // Legacy tokens (issued before this field existed) carry no version;
        // treat their expected version as 0 to match untouched accounts.
        const tokenVersion = decoded.tokenVersion ?? 0;
        if (tokenVersion !== (user.tokenVersion ?? 0)) {
            return res.status(401).json({
                message: "Session expired. Please log in again.",
            });
        }

        // SAVE FULL USER INFO
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Not authorized",
        });
    }
};


// ADMIN ONLY
exports.adminOnly = (req, res, next) => {

    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only",
        });
    }

    next();
};


// ROLE ALLOWLIST
// Added alongside adminOnly rather than replacing it: every existing route
// keeps its original guard, and only routes that genuinely need a wider or
// narrower audience move over to this one.
exports.authorize = (...allowedRoles) => (req, res, next) => {

    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            message: "You don't have permission to do that",
        });
    }

    next();
};


// PERMISSION CHECK (see config/roles.js for the matrix)
// Preferred over listing roles inline: when a permission moves between roles
// there is one place to change, and the mobile menus read the same matrix.
exports.requirePermission = (permission) => (req, res, next) => {

    if (!req.user || !can(req.user.role, permission)) {
        return res.status(403).json({
            message: "You don't have permission to do that",
        });
    }

    next();
};


// STAFF ONLY (blocks admins from punching, travelling and taking leave)
// Admins administer; they don't attend. Kept as its own guard so the reason a
// request was refused is obvious in the response.
exports.staffOnly = (req, res, next) => {

    if (!req.user || !isStaffRole(req.user.role)) {
        return res.status(403).json({
            message: "Admin accounts don't record attendance or travel.",
        });
    }

    next();
};


// SUPER ADMIN ONLY
exports.superAdminOnly = (req, res, next) => {

    if (!req.user || req.user.role !== "superadmin") {
        return res.status(403).json({
            message: "Super admin access only",
        });
    }

    next();
};


// PREMIUM PLAN ONLY (blocks Standard-plan companies from Travel/Payroll/Salary Slip/Report)
exports.restrictToPremium = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Not authorized",
            });
        }

        // SUPER ADMIN ALWAYS HAS FULL ACCESS
        if (req.user.role === "superadmin" || !req.user.companyId) {
            return next();
        }

        const company = await Company.findById(req.user.companyId).select("subscription.plan");

        if (company && company.subscription.plan === "Standard") {
            return res.status(403).json({
                message: "This feature isn't included in your company's plan. Contact your admin to upgrade to Premium.",
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};