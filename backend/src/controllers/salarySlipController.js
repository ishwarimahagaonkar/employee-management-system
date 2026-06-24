const PDFDocument = require("pdfkit");
const User = require("../models/User");
const Attendance = require("../models/Attendance");

exports.generateSalarySlip = async (req, res) => {
    try {
        const { userId, month, year } = req.query;

        const user = await User.findById(userId);

        const records = await Attendance.find({ userId });

        const filtered = records.filter((att) => {
            if (!att.date) return false;
            const [y, m, d] = att.date.split("-");
            if (y !== year.toString()) return false;

            const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
            const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

            const mIdx = parseInt(m, 10) - 1;
            const recordMonthLong = monthNames[mIdx];
            const recordMonthShort = shortMonthNames[mIdx];

            const searchMonth = month.toString().toLowerCase();
            return searchMonth === recordMonthLong ||
                   searchMonth === recordMonthShort ||
                   searchMonth === m ||
                   parseInt(searchMonth, 10) === parseInt(m, 10);
        });

        let totalHours = 0;

        filtered.forEach((r) => {
            totalHours += r.workingHours || 0;
        });

        const hourlyRate = user.hourlyRate || 100;
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
        doc.fontSize(18).text("MEP POWERTECH PVT LTD", { align: "center" });
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
        res.status(500).json({ message: err.message });
    }
};