const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// ================= REGISTER =================
exports.register = async (req, res) => {
    try {

        const {
            empID,
            fullName,
            email,
            password,
            role,
            department,
            designation,
        } = req.body;

        // CHECK REQUIRED FIELDS
        if (!empID || !fullName || !email || !password) {
            return res.status(400).json({
                message: "Please fill all required fields",
            });
        }

        // CHECK EXISTING USER
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // HASH PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        // CREATE USER
        const user = await User.create({
            empID,
            fullName,
            email,
            password: hashedPassword,
            role,
            department,
            designation,
        });

        // REMOVE PASSWORD FROM RESPONSE
        const userResponse = {
            _id: user._id,
            empID: user.empID,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            createdAt: user.createdAt,
        };

        res.status(201).json({
            message: "User registered successfully",
            user: userResponse,
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });
        

    }
};


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
            department: user.department,
            designation: user.designation,
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