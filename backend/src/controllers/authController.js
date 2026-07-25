const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// NOTE: Public self-registration has been removed. Users are created only
// through authenticated, role-scoped flows:
//   - Employees/admins:    POST /api/employees   (admin only)
//   - A company's first admin: POST /api/companies (super admin only)
// This closes the privilege-escalation hole where anyone could register as admin.


// ================= LOGIN =================
exports.login = async (req, res) => {

    try {
        const { email, password } = req.body;

        // CHECK REQUIRED FIELDS (must be strings -- rejects injected objects)
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // FIND USER
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        // CHECK PASSWORD
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        // BLOCK DEACTIVATED ACCOUNTS
        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been deactivated. Contact your admin.",
            });
        }

        // BLOCK LOGIN IF THE COMPANY'S SUBSCRIPTION IS SUSPENDED/EXPIRED
        let company = null;

        if (user.role !== "superadmin" && user.companyId) {
            company = await Company.findById(user.companyId);

            if (company && ["suspended", "expired"].includes(company.subscription.status)) {
                return res.status(403).json({
                    message: `Your company's subscription is ${company.subscription.status}. Contact support.`,
                });
            }
        }

        // GENERATE TOKEN
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                tokenVersion: user.tokenVersion ?? 0,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // USER RESPONSE
        const userResponse = {
            _id: user._id,
            empID: user.empID,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            department: user.department,
            designation: user.designation,
            company: company ? { plan: company.subscription.plan } : null,
        };

        res.status(200).json({
            message: "Login successful",
            token,
            user: userResponse,
        });

    } catch (error) {
        console.error("login error:", error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

// ================= LOGOUT =================
// Invalidates the current token (and any other live sessions) by bumping the
// user's tokenVersion, so a JWT can't be reused after logout.
exports.logout = async (req, res) => {
  try {
    if (req.user?._id) {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { tokenVersion: 1 } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};