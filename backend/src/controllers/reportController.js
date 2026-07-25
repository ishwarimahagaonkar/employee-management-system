const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Travel = require("../models/Travel");
const Holiday = require("../models/Holiday");

const NOT_AVAILABLE = "Not available";

/* =========================
   DATE HELPERS
   All stored dates are "YYYY-MM-DD" strings (Asia/Kolkata calendar dates),
   so we walk them as UTC-anchored Date objects purely to step day-by-day --
   never to read a local calendar date back out.
========================= */
function eachDateStr(startDate, endDate) {
    const dates = [];
    let cursor = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    while (cursor <= end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    return dates;
}

function isWeekday(dateStr) {
    const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
}

/* =========================
   BUILD REPORT DATA
   Shared by the JSON preview endpoint and all three export formats.
========================= */
async function buildEmployeeReport({ userId, startDate, endDate, adminName, companyId }) {
    if (!userId || !startDate || !endDate) {
        const err = new Error("userId, startDate and endDate are required");
        err.status = 400;
        throw err;
    }

    if (startDate > endDate) {
        const err = new Error("startDate must be before endDate");
        err.status = 400;
        throw err;
    }

    const employee = await User.findById(userId).select("empID fullName department designation companyId");

    if (!employee || employee.role === "admin" || String(employee.companyId ?? null) !== String(companyId ?? null)) {
        const err = new Error("Employee not found");
        err.status = 404;
        throw err;
    }

    const [attendanceRecords, leaveRecords, travelRecords, coTravelRecords, holidayRecords] = await Promise.all([
        Attendance.find({ userId, date: { $gte: startDate, $lte: endDate } }),
        Leave.find({
            userId,
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
        }).sort({ startDate: 1 }),
        Travel.find({ userId, date: { $gte: startDate, $lte: endDate } })
            .populate("trips.coTravelers", "fullName")
            .sort({ date: 1 }),
        // Trips (owned by others) where this employee was a co-traveler.
        Travel.find({ "trips.coTravelers": userId, date: { $gte: startDate, $lte: endDate } })
            .populate("userId", "fullName")
            .sort({ date: 1 }),
        Holiday.find({ companyId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
    ]);

    const attendanceByDate = new Map(attendanceRecords.map((a) => [a.date, a]));

    // Only approved leaves affect the day-by-day attendance/payroll math below.
    const approvedLeaves = leaveRecords.filter((l) => l.status === "Approved");
    const approvedLeaveOnDay = (dateStr) =>
        approvedLeaves.find((l) => l.startDate <= dateStr && l.endDate >= dateStr);

    const holidayDateSet = new Set(holidayRecords.map((h) => h.date));

    const workingDates = eachDateStr(startDate, endDate)
        .filter(isWeekday)
        .filter((dateStr) => !holidayDateSet.has(dateStr));

    let presentDays = 0;
    let lateArrivals = 0;
    let halfDays = 0;
    let absentDays = 0;
    let unpaidLeaveWorkingDays = 0;

    workingDates.forEach((dateStr) => {
        const record = attendanceByDate.get(dateStr);

        // "pending"/"rejected" are unresolved/declined emergency requests --
        // they don't count as a confirmed attendance for the day.
        if (record && ["present", "late", "approved"].includes(record.status)) {
            if (record.isHalfDay) {
                halfDays++;
            } else {
                presentDays++;
            }
            if (record.status === "late") lateArrivals++;
            return;
        }

        const leave = approvedLeaveOnDay(dateStr);
        if (leave) {
            if (leave.leaveType === "Unpaid") unpaidLeaveWorkingDays++;
            return;
        }

        absentDays++;
    });

    const totalWorkingDays = workingDates.length;
    const attendancePercentage = totalWorkingDays
        ? Number((((presentDays + halfDays * 0.5) / totalWorkingDays) * 100).toFixed(1))
        : 0;

    // Leave-summary aggregates come from the actual Leave documents overlapping
    // the period (not clipped to weekdays), since a leave request itself isn't
    // limited to working days.
    const sumDays = (records) => records.reduce((sum, l) => sum + (l.totalDays || 0), 0);

    const totalApprovedLeaveDays = sumDays(leaveRecords.filter((l) => l.status === "Approved"));
    const totalPaidLeaveDays = sumDays(
        leaveRecords.filter((l) => l.status === "Approved" && l.leaveType === "Paid")
    );
    const totalUnpaidLeaveDays = sumDays(
        leaveRecords.filter((l) => l.status === "Approved" && l.leaveType === "Unpaid")
    );
    const totalPendingOrRejectedDays = sumDays(
        leaveRecords.filter((l) => l.status === "Pending" || l.status === "Rejected")
    );

    const travelEntries = [];
    travelRecords.forEach((t) => {
        (t.trips || []).forEach((trip) => {
            travelEntries.push({
                date: t.date,
                destination:
                    trip.endLocation?.address ||
                    trip.startLocation?.address ||
                    trip.meetingDetails?.customerName ||
                    NOT_AVAILABLE,
                purpose: trip.purpose || NOT_AVAILABLE,
                distanceKm: trip.distanceKm || 0,
                approvalStatus: NOT_AVAILABLE,
                expenseAmount: NOT_AVAILABLE,

                // Full trip detail for the timeline view (start -> end -> meeting).
                startTime: trip.startTime,
                endTime: trip.endTime,
                startLocation: trip.startLocation,
                endLocation: trip.endLocation,
                durationMin: trip.durationMin,
                meetingDetails: trip.meetingDetails,
                coTravelers: (trip.coTravelers || []).map((c) => ({ fullName: c.fullName })),
                status: trip.endTime ? "completed" : "in-progress",
            });
        });
    });

    // Trips where this employee only participated as a co-traveler: shown with
    // 0 km and "traveled with <primary>", contributing nothing to reimbursement.
    coTravelRecords.forEach((t) => {
        const primaryName = t.userId?.fullName || "a colleague";
        (t.trips || []).forEach((trip) => {
            const isCo = (trip.coTravelers || []).some((id) => String(id) === String(userId));
            if (!isCo) return;

            travelEntries.push({
                date: t.date,
                destination:
                    trip.endLocation?.address ||
                    trip.startLocation?.address ||
                    trip.meetingDetails?.customerName ||
                    NOT_AVAILABLE,
                purpose: trip.purpose || NOT_AVAILABLE,
                distanceKm: 0,
                approvalStatus: NOT_AVAILABLE,
                expenseAmount: NOT_AVAILABLE,

                startTime: trip.startTime,
                endTime: trip.endTime,
                startLocation: trip.startLocation,
                endLocation: trip.endLocation,
                durationMin: trip.durationMin,
                meetingDetails: trip.meetingDetails,
                traveledWith: primaryName,
                isCoTraveler: true,
                status: trip.endTime ? "completed" : "in-progress",
            });
        });
    });

    travelEntries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const totalKmTravelled = Number(
        travelEntries.reduce((sum, t) => sum + (t.distanceKm || 0), 0).toFixed(1)
    );

    const totalPayableDays = totalWorkingDays - unpaidLeaveWorkingDays - absentDays;

    const notesParts = [];
    if (unpaidLeaveWorkingDays > 0) {
        notesParts.push(`${unpaidLeaveWorkingDays} unpaid leave working day(s) reduce payable days.`);
    }
    if (absentDays > 0) {
        notesParts.push(`${absentDays} unexplained absence day(s) reduce payable days.`);
    }
    if (travelEntries.length > 0) {
        notesParts.push("Travel claim amounts are not tracked in the system; verify reimbursements manually.");
    }
    if (notesParts.length === 0) {
        notesParts.push("No payroll-impacting deductions for this period.");
    }

    return {
        employee: {
            employeeId: employee.empID,
            fullName: employee.fullName,
            department: employee.department || NOT_AVAILABLE,
            designation: employee.designation || NOT_AVAILABLE,
        },
        reportingPeriod: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        generatedBy: adminName || NOT_AVAILABLE,

        attendanceSummary: {
            totalWorkingDays,
            presentDays,
            absentDays,
            lateArrivals,
            halfDays,
            overtimeHours: NOT_AVAILABLE,
            attendancePercentage,
        },

        holidaySummary: {
            count: holidayRecords.length,
            records: holidayRecords.map((h) => ({ date: h.date, name: h.name })),
        },

        leaveSummary: {
            records: leaveRecords.map((l) => ({
                leaveType: l.leaveType,
                startDate: l.startDate,
                endDate: l.endDate,
                totalDays: l.totalDays,
                status: l.status,
            })),
            totalApprovedLeaveDays,
            totalPaidLeaveDays,
            totalUnpaidLeaveDays,
            totalPendingOrRejectedDays,
        },

        travelSummary: {
            records: travelEntries,
            totalKmTravelled,
            totalApprovedTravelClaims: NOT_AVAILABLE,
        },

        payrollImpact: {
            totalPayableDays,
            totalUnpaidLeaveAbsenceDays: unpaidLeaveWorkingDays + absentDays,
            approvedTravelReimbursement: NOT_AVAILABLE,
            notes: notesParts.join(" "),
        },
    };
}

/* =========================
   EXCEL (.xlsx) EXPORT
========================= */
async function buildExcelBuffer(report) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = report.generatedBy;
    workbook.created = new Date();

    const infoSheet = workbook.addWorksheet("Employee Info");
    infoSheet.columns = [
        { header: "Field", key: "field", width: 26 },
        { header: "Value", key: "value", width: 40 },
    ];
    infoSheet.addRows([
        { field: "Employee ID", value: report.employee.employeeId },
        { field: "Full Name", value: report.employee.fullName },
        { field: "Department", value: report.employee.department },
        { field: "Designation", value: report.employee.designation },
        { field: "Reporting Period", value: `${report.reportingPeriod.startDate} to ${report.reportingPeriod.endDate}` },
        { field: "Report Generated On", value: new Date(report.generatedAt).toLocaleString() },
        { field: "Generated By", value: report.generatedBy },
    ]);
    infoSheet.getRow(1).font = { bold: true };

    const attSheet = workbook.addWorksheet("Attendance Summary");
    attSheet.columns = [
        { header: "Metric", key: "metric", width: 28 },
        { header: "Value", key: "value", width: 20 },
    ];
    const a = report.attendanceSummary;
    attSheet.addRows([
        { metric: "Total Working Days", value: a.totalWorkingDays },
        { metric: "Present Days", value: a.presentDays },
        { metric: "Absent Days", value: a.absentDays },
        { metric: "Late Check-ins", value: a.lateArrivals },
        { metric: "Half Days", value: a.halfDays },
        { metric: "Overtime Hours", value: a.overtimeHours },
        { metric: "Attendance Percentage", value: `${a.attendancePercentage}%` },
    ]);
    attSheet.getRow(1).font = { bold: true };

    const holidaySheet = workbook.addWorksheet("Holidays");
    holidaySheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Holiday", key: "name", width: 30 },
    ];
    report.holidaySummary.records.forEach((h) => holidaySheet.addRow(h));
    holidaySheet.getRow(1).font = { bold: true };
    holidaySheet.addRow([]);
    holidaySheet.addRow(["Total Holidays (excluded from working days)", report.holidaySummary.count]);

    const leaveSheet = workbook.addWorksheet("Leave Summary");
    leaveSheet.columns = [
        { header: "Leave Type", key: "leaveType", width: 14 },
        { header: "Start Date", key: "startDate", width: 14 },
        { header: "End Date", key: "endDate", width: 14 },
        { header: "Days", key: "totalDays", width: 10 },
        { header: "Status", key: "status", width: 14 },
    ];
    report.leaveSummary.records.forEach((l) => leaveSheet.addRow(l));
    leaveSheet.getRow(1).font = { bold: true };
    leaveSheet.addRow([]);
    leaveSheet.addRow(["Total Approved Leave Days", report.leaveSummary.totalApprovedLeaveDays]);
    leaveSheet.addRow(["Total Paid Leave Days", report.leaveSummary.totalPaidLeaveDays]);
    leaveSheet.addRow(["Total Unpaid Leave Days", report.leaveSummary.totalUnpaidLeaveDays]);
    leaveSheet.addRow(["Total Pending/Rejected Leave Days", report.leaveSummary.totalPendingOrRejectedDays]);

    const travelSheet = workbook.addWorksheet("Travel Summary");
    travelSheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Destination", key: "destination", width: 32 },
        { header: "Purpose", key: "purpose", width: 26 },
        { header: "Distance (km)", key: "distanceKm", width: 14 },
        { header: "Approval Status", key: "approvalStatus", width: 18 },
        { header: "Expense Amount", key: "expenseAmount", width: 18 },
    ];
    report.travelSummary.records.forEach((t) => travelSheet.addRow(t));
    travelSheet.getRow(1).font = { bold: true };
    travelSheet.addRow([]);
    travelSheet.addRow(["Total KMs Travelled", report.travelSummary.totalKmTravelled]);
    travelSheet.addRow(["Total Approved Travel Claims", report.travelSummary.totalApprovedTravelClaims]);

    const payrollSheet = workbook.addWorksheet("Payroll Impact");
    payrollSheet.columns = [
        { header: "Metric", key: "metric", width: 34 },
        { header: "Value", key: "value", width: 40 },
    ];
    const p = report.payrollImpact;
    payrollSheet.addRows([
        { metric: "Total Payable Days", value: p.totalPayableDays },
        { metric: "Total Unpaid Leave/Absence Days", value: p.totalUnpaidLeaveAbsenceDays },
        { metric: "Approved Travel Reimbursement", value: p.approvedTravelReimbursement },
        { metric: "Notes", value: p.notes },
    ]);
    payrollSheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
}

/* =========================
   CSV EXPORT
   Hand-rolled (no multi-sheet CSV concept exists), sections stacked with
   blank-line separators.
========================= */
function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function csvRow(fields) {
    return fields.map(csvEscape).join(",") + "\r\n";
}

function buildCsvString(report) {
    let out = "";

    out += csvRow(["EMPLOYEE INFORMATION"]);
    out += csvRow(["Employee ID", report.employee.employeeId]);
    out += csvRow(["Full Name", report.employee.fullName]);
    out += csvRow(["Department", report.employee.department]);
    out += csvRow(["Designation", report.employee.designation]);
    out += csvRow(["Reporting Period", `${report.reportingPeriod.startDate} to ${report.reportingPeriod.endDate}`]);
    out += csvRow(["Report Generated On", new Date(report.generatedAt).toLocaleString()]);
    out += csvRow(["Generated By", report.generatedBy]);
    out += csvRow([]);

    const a = report.attendanceSummary;
    out += csvRow(["ATTENDANCE SUMMARY"]);
    out += csvRow(["Total Working Days", a.totalWorkingDays]);
    out += csvRow(["Present Days", a.presentDays]);
    out += csvRow(["Absent Days", a.absentDays]);
    out += csvRow(["Late Check-ins", a.lateArrivals]);
    out += csvRow(["Half Days", a.halfDays]);
    out += csvRow(["Overtime Hours", a.overtimeHours]);
    out += csvRow(["Attendance Percentage", `${a.attendancePercentage}%`]);
    out += csvRow([]);

    out += csvRow(["HOLIDAYS (excluded from working days)"]);
    out += csvRow(["Date", "Holiday"]);
    report.holidaySummary.records.forEach((h) => {
        out += csvRow([h.date, h.name]);
    });
    out += csvRow([]);
    out += csvRow(["Total Holidays", report.holidaySummary.count]);
    out += csvRow([]);

    out += csvRow(["LEAVE SUMMARY"]);
    out += csvRow(["Leave Type", "Start Date", "End Date", "Days", "Status"]);
    report.leaveSummary.records.forEach((l) => {
        out += csvRow([l.leaveType, l.startDate, l.endDate, l.totalDays, l.status]);
    });
    out += csvRow([]);
    out += csvRow(["Total Approved Leave Days", report.leaveSummary.totalApprovedLeaveDays]);
    out += csvRow(["Total Paid Leave Days", report.leaveSummary.totalPaidLeaveDays]);
    out += csvRow(["Total Unpaid Leave Days", report.leaveSummary.totalUnpaidLeaveDays]);
    out += csvRow(["Total Pending/Rejected Leave Days", report.leaveSummary.totalPendingOrRejectedDays]);
    out += csvRow([]);

    out += csvRow(["TRAVEL SUMMARY"]);
    out += csvRow(["Date", "Destination", "Purpose", "Distance (km)", "Approval Status", "Expense Amount"]);
    report.travelSummary.records.forEach((t) => {
        out += csvRow([t.date, t.destination, t.purpose, t.distanceKm, t.approvalStatus, t.expenseAmount]);
    });
    out += csvRow([]);
    out += csvRow(["Total KMs Travelled", report.travelSummary.totalKmTravelled]);
    out += csvRow(["Total Approved Travel Claims", report.travelSummary.totalApprovedTravelClaims]);
    out += csvRow([]);

    const p = report.payrollImpact;
    out += csvRow(["PAYROLL IMPACT SUMMARY"]);
    out += csvRow(["Total Payable Days", p.totalPayableDays]);
    out += csvRow(["Total Unpaid Leave/Absence Days", p.totalUnpaidLeaveAbsenceDays]);
    out += csvRow(["Approved Travel Reimbursement", p.approvedTravelReimbursement]);
    out += csvRow(["Notes", p.notes]);

    return out;
}

/* =========================
   PDF EXPORT
========================= */
function writePdfReport(doc, report) {
    doc.fontSize(16).text("Employee Report", { align: "center" });
    doc.fontSize(9).fillColor("#555").text(
        `Generated on ${new Date(report.generatedAt).toLocaleString()} by ${report.generatedBy}`,
        { align: "center" }
    );
    doc.fillColor("#000");
    doc.moveDown();

    doc.fontSize(12).text("1. Employee Information", { underline: true });
    doc.fontSize(10);
    doc.text(`Employee ID: ${report.employee.employeeId}`);
    doc.text(`Full Name: ${report.employee.fullName}`);
    doc.text(`Department: ${report.employee.department}`);
    doc.text(`Designation: ${report.employee.designation}`);
    doc.text(`Reporting Period: ${report.reportingPeriod.startDate} to ${report.reportingPeriod.endDate}`);
    doc.moveDown();

    const a = report.attendanceSummary;
    doc.fontSize(12).text("2. Attendance Summary", { underline: true });
    doc.fontSize(10);
    doc.text(`Total Working Days: ${a.totalWorkingDays}`);
    doc.text(`Present Days: ${a.presentDays}`);
    doc.text(`Absent Days: ${a.absentDays}`);
    doc.text(`Late Check-ins: ${a.lateArrivals}`);
    doc.text(`Half Days: ${a.halfDays}`);
    doc.text(`Overtime Hours: ${a.overtimeHours}`);
    doc.text(`Attendance Percentage: ${a.attendancePercentage}%`);
    doc.moveDown();

    doc.fontSize(12).text("3. Holidays", { underline: true });
    doc.fontSize(10);
    if (report.holidaySummary.records.length === 0) {
        doc.text("No holidays in this period.");
    } else {
        report.holidaySummary.records.forEach((h) => {
            doc.text(`${h.date}  |  ${h.name}`);
        });
    }
    doc.moveDown(0.5);
    doc.text(`Total Holidays (excluded from working days): ${report.holidaySummary.count}`);
    doc.moveDown();

    doc.fontSize(12).text("4. Leave Summary", { underline: true });
    doc.fontSize(10);
    if (report.leaveSummary.records.length === 0) {
        doc.text("No leave records in this period.");
    } else {
        report.leaveSummary.records.forEach((l) => {
            doc.text(`${l.leaveType} Leave  |  ${l.startDate} to ${l.endDate}  |  ${l.totalDays} day(s)  |  ${l.status}`);
        });
    }
    doc.moveDown(0.5);
    doc.text(`Total Approved Leave Days: ${report.leaveSummary.totalApprovedLeaveDays}`);
    doc.text(`Total Paid Leave Days: ${report.leaveSummary.totalPaidLeaveDays}`);
    doc.text(`Total Unpaid Leave Days: ${report.leaveSummary.totalUnpaidLeaveDays}`);
    doc.text(`Total Pending/Rejected Leave Days: ${report.leaveSummary.totalPendingOrRejectedDays}`);
    doc.moveDown();

    doc.fontSize(12).text("5. Travel Summary", { underline: true });
    doc.fontSize(10);
    if (report.travelSummary.records.length === 0) {
        doc.text("No travel records in this period.");
    } else {
        report.travelSummary.records.forEach((t) => {
            doc.text(`${t.date}  |  ${t.destination}  |  ${t.purpose}  |  ${t.distanceKm} km  |  Approval: ${t.approvalStatus}  |  Expense: ${t.expenseAmount}`);
        });
    }
    doc.moveDown(0.5);
    doc.text(`Total KMs Travelled: ${report.travelSummary.totalKmTravelled} km`);
    doc.text(`Total Approved Travel Claims: ${report.travelSummary.totalApprovedTravelClaims}`);
    doc.moveDown();

    const p = report.payrollImpact;
    doc.fontSize(12).text("6. Payroll Impact Summary", { underline: true });
    doc.fontSize(10);
    doc.text(`Total Payable Days: ${p.totalPayableDays}`);
    doc.text(`Total Unpaid Leave/Absence Days: ${p.totalUnpaidLeaveAbsenceDays}`);
    doc.text(`Approved Travel Reimbursement: ${p.approvedTravelReimbursement}`);
    doc.text(`Notes: ${p.notes}`);
    doc.moveDown();

    doc.fontSize(8).fillColor("#777").text("This is a system generated report.", { align: "center" });
}

/* =========================
   ROUTE HANDLERS
========================= */

/**
 * @desc Preview an employee's report (JSON)
 * @route GET /api/report/employee
 * @access Admin
 */
exports.getEmployeeReport = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;
        const report = await buildEmployeeReport({
            userId,
            startDate,
            endDate,
            adminName: req.user.fullName,
            companyId: req.user.companyId,
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        // Intentional 4xx errors carry a safe message; unexpected errors are
        // logged and returned generically so internals don't leak.
        const status = error.status || 500;
        if (status === 500) console.error("report error:", error);
        res.status(status).json({
            success: false,
            message: status === 500 ? "Server error" : error.message,
        });
    }
};

/**
 * @desc Export an employee's report as xlsx, csv or pdf
 * @route GET /api/report/employee/export
 * @access Admin
 */
exports.exportEmployeeReport = async (req, res) => {
    try {
        const { userId, startDate, endDate, format } = req.query;
        const report = await buildEmployeeReport({
            userId,
            startDate,
            endDate,
            adminName: req.user.fullName,
            companyId: req.user.companyId,
        });

        const filenameBase = `report-${report.employee.employeeId}-${startDate}_to_${endDate}`;

        if (format === "xlsx") {
            const buffer = await buildExcelBuffer(report);
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader("Content-Disposition", `attachment; filename=${filenameBase}.xlsx`);
            return res.send(Buffer.from(buffer));
        }

        if (format === "csv") {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=${filenameBase}.csv`);
            return res.send(buildCsvString(report));
        }

        if (format === "pdf") {
            const doc = new PDFDocument({ margin: 40 });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=${filenameBase}.pdf`);
            doc.pipe(res);
            writePdfReport(doc, report);
            doc.end();
            return;
        }

        return res.status(400).json({
            success: false,
            message: "format must be one of xlsx, csv, pdf",
        });
    } catch (error) {
        // Intentional 4xx errors carry a safe message; unexpected errors are
        // logged and returned generically so internals don't leak.
        const status = error.status || 500;
        if (status === 500) console.error("report error:", error);
        res.status(status).json({
            success: false,
            message: status === 500 ? "Server error" : error.message,
        });
    }
};
