const PDFDocument = require("pdfkit");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");
const { monthDateRange } = require("../utils/monthRange");

// Only these statuses represent days the employee is actually paid for.
const PAYABLE_STATUSES = ["present", "late", "approved"];

exports.generateSalarySlip = async (req, res) => {
    try {
        const { userId, month, year } = req.query;

        if (!userId || !month || !year || isNaN(Number(year))) {
            return res.status(400).json({ message: "userId, month and year are required" });
        }

        const range = monthDateRange(month, year);
        if (!range) {
            return res.status(400).json({ message: "Invalid month or year" });
        }

        const user = await User.findById(userId);

        if (!user || String(user.companyId ?? null) !== String(req.user.companyId ?? null)) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Company name for the slip header comes from the company's settings,
        // not a hardcoded string.
        const settings = await Settings.findOne({ companyId: req.user.companyId ?? null });
        const companyName = settings?.companyName || "Company";

        // Index-served range query for the month; only paid statuses count.
        const filtered = await Attendance.find({
            userId,
            date: { $gte: range.gte, $lte: range.lte },
            status: { $in: PAYABLE_STATUSES },
        }).select("workingHours");

        const totalHours = filtered.reduce((sum, r) => sum + (r.workingHours || 0), 0);

        const hourlyRate = user.hourlyRate || 0;
        const grossSalary = totalHours * hourlyRate;

        // simple structure like your file
        const basicSalary = grossSalary * 0.4;
        const hra = grossSalary * 0.3;
        const conveyance = grossSalary * 0.1;
        const allowance = grossSalary * 0.2;

        const totalEarnings = grossSalary;

        const pf = grossSalary * 0.12;
        const professionalTax = 200;

        const totalDeductions = pf + professionalTax;

        const netSalary = totalEarnings - totalDeductions;

        // ================= PDF =================
        const doc = new PDFDocument({ margin: 30 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=salary-slip-${month}-${year}.pdf`
        );

        doc.pipe(res);

        // HEADER
        doc.fontSize(18).text(companyName, { align: "center" });
        doc.fontSize(10).text("PAY SLIP", { align: "center" });
        doc.moveDown();

        // EMPLOYEE DETAILS
        doc.fontSize(12).text(`Employee Name: ${user.fullName}`);
        doc.text(`Department: ${user.department}`);
        doc.text(`Designation: ${user.designation}`);
        doc.text(`Month: ${month} ${year}`);
        doc.moveDown();

        // ATTENDANCE SUMMARY
        doc.text("---- ATTENDANCE SUMMARY ----");
        doc.text(`Total Working Hours: ${totalHours.toFixed(2)}`);
        doc.text(`Working Days: ${filtered.length}`);
        doc.text(`Hourly Rate: ${hourlyRate.toFixed(2)}`);
        doc.moveDown();

        // EARNINGS
        doc.text("---- EARNINGS ----");
        doc.text(`Basic Salary: ${basicSalary.toFixed(2)}`);
        doc.text(`HRA: ${hra.toFixed(2)}`);
        doc.text(`Conveyance: ${conveyance.toFixed(2)}`);
        doc.text(`Allowance: ${allowance.toFixed(2)}`);
        doc.text(`Gross Salary: ${totalEarnings.toFixed(2)}`);
        doc.moveDown();

        // DEDUCTIONS
        doc.text("---- DEDUCTIONS ----");
        doc.text(`PF: ${pf.toFixed(2)}`);
        doc.text(`Professional Tax: ${professionalTax}`);
        doc.text(`Total Deductions: ${totalDeductions.toFixed(2)}`);
        doc.moveDown();

        // NET SALARY
        doc.fontSize(14).text(`NET SALARY: ₹${netSalary.toFixed(2)}`);
        doc.moveDown();

        // FOOTER
        doc.fontSize(10).text("This is a system generated salary slip.", {
            align: "center"
        });

        doc.end();

    } catch (err) {
        console.error("generateSalarySlip error:", err);
        res.status(500).json({ message: "Server error" });
    }
};