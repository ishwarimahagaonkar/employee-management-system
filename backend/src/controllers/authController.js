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

        // CHECK REQUIRED FIELDS
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // FIND USER
        const user = await User.findOne({ email });

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

        res.status(500).json({
            message: error.message,
        });

    }
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};