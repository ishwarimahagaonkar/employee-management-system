const Company = require("../models/Company");
const User = require("../models/User");
const Holiday = require("../models/Holiday");
const Settings = require("../models/Settings");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Travel = require("../models/Travel");
const bcrypt = require("bcryptjs");
const { defaultHolidaysForYear } = require("../utils/defaultHolidays");
const { validatePassword, isValidEmail } = require("../utils/validators");
const { deletePunchPhotos } = require("../utils/photoStorage");

const VALID_PLANS = ["Standard", "Premium"];


// ==========================
// CREATE COMPANY (SUPER ADMIN)
// Creates the company + its first admin user
// ==========================
exports.createCompany = async (req, res) => {
    try {
        const {
            name,
            contactPerson,
            email,
            phone,
            address,
            plan,
            employeeLimit,
            admin,
        } = req.body;

        if (!name || !contactPerson || !email) {
            return res.status(400).json({
                message: "Company name, contact person and email are required",
            });
        }

        if (!admin || !admin.empID || !admin.fullName || !admin.email || !admin.password) {
            return res.status(400).json({
                message: "Admin empID, fullName, email and password are required",
            });
        }

        if (!isValidEmail(email) || !isValidEmail(admin.email)) {
            return res.status(400).json({ message: "Please provide valid company and admin email addresses" });
        }

        const adminPasswordError = validatePassword(admin.password);
        if (adminPasswordError) {
            return res.status(400).json({ message: adminPasswordError });
        }

        if (plan !== undefined && !VALID_PLANS.includes(plan)) {
            return res.status(400).json({
                message: `Plan must be one of: ${VALID_PLANS.join(", ")}`,
            });
        }

        const normalizedCompanyEmail = email.toLowerCase();
        const normalizedAdminEmail = admin.email.toLowerCase();

        const existingCompany = await Company.findOne({ email: normalizedCompanyEmail });
        if (existingCompany) {
            return res.status(400).json({
                message: "A company with this email already exists",
            });
        }

        const existingUser = await User.findOne({ email: normalizedAdminEmail });
        if (existingUser) {
            return res.status(400).json({
                message: "A user with this admin email already exists",
            });
        }

        const company = await Company.create({
            name,
            contactPerson,
            email: normalizedCompanyEmail,
            phone,
            address,
            subscription: {
                plan: plan || "Premium",
                status: "trial",
                startDate: new Date(),
                employeeLimit: employeeLimit || 10,
            },
        });

        const hashedPassword = await bcrypt.hash(admin.password, 10);

        const adminUser = await User.create({
            empID: admin.empID,
            fullName: admin.fullName,
            email: normalizedAdminEmail,
            password: hashedPassword,
            role: "admin",
            department: admin.department,
            designation: admin.designation,
            companyId: company._id,
        });

        // Seed the default national holiday list for the new company (current year)
        // and record the seeded year so the yearly auto-seed doesn't repeat it.
        const year = new Date().getFullYear();
        await Holiday.insertMany(
            defaultHolidaysForYear(year).map((h) => ({ ...h, companyId: company._id }))
        );
        await Settings.findOneAndUpdate(
            { companyId: company._id },
            { $set: { holidaySeedYear: year }, $setOnInsert: { companyId: company._id } },
            { upsert: true }
        );

        const adminUserObj = adminUser.toObject();
        delete adminUserObj.password;

        return res.status(201).json({
            message: "Company created successfully",
            company,
            admin: adminUserObj,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// GET ALL COMPANIES (SUPER ADMIN)
// ==========================
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });

        return res.status(200).json({
            count: companies.length,
            companies,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// GET COMPANY BY ID
// ==========================
exports.getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }

        return res.status(200).json(company);

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// UPDATE COMPANY PROFILE
// ==========================
exports.updateCompany = async (req, res) => {
    try {
        const { name, contactPerson, email, phone, address } = req.body;

        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }

        if (name !== undefined) company.name = name;
        if (contactPerson !== undefined) company.contactPerson = contactPerson;
        if (email !== undefined) company.email = email.toLowerCase();
        if (phone !== undefined) company.phone = phone;
        if (address !== undefined) company.address = address;

        await company.save();

        return res.status(200).json({
            message: "Company updated successfully",
            company,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// UPDATE SUBSCRIPTION
// ==========================
exports.updateSubscription = async (req, res) => {
    try {
        const { plan, status, startDate, endDate, employeeLimit } = req.body;

        if (plan !== undefined && !VALID_PLANS.includes(plan)) {
            return res.status(400).json({
                message: `Plan must be one of: ${VALID_PLANS.join(", ")}`,
            });
        }

        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }

        if (plan !== undefined) company.subscription.plan = plan;
        if (status !== undefined) company.subscription.status = status;
        if (startDate !== undefined) company.subscription.startDate = startDate;
        if (endDate !== undefined) company.subscription.endDate = endDate;
        if (employeeLimit !== undefined) company.subscription.employeeLimit = employeeLimit;

        await company.save();

        return res.status(200).json({
            message: "Subscription updated successfully",
            company,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


// ==========================
// DELETE COMPANY
// ==========================
exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }

        const companyId = req.params.id;

        // Punch photo files first -- the records referencing them are about
        // to go, and orphaned images would sit on disk forever.
        const photoRows = await Attendance.find({ companyId })
            .select("punchInPhoto punchOutPhoto")
            .lean();
        deletePunchPhotos(photoRows.flatMap((r) => [r.punchInPhoto, r.punchOutPhoto]));

        // Cascade: remove everything scoped to this company so nothing is left
        // orphaned when the company itself is gone.
        await Promise.all([
            User.deleteMany({ companyId }),
            Attendance.deleteMany({ companyId }),
            Leave.deleteMany({ companyId }),
            Travel.deleteMany({ companyId }),
            Holiday.deleteMany({ companyId }),
            Settings.deleteMany({ companyId }),
        ]);

        await Company.findByIdAndDelete(companyId);

        return res.status(200).json({
            message: "Company and all its data deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};
