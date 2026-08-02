const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const LabourAttendance = require("../models/LabourAttendance");
const Labour = require("../models/Labour");
const Site = require("../models/Site");
const User = require("../models/User");
const { ROLES } = require("../config/roles");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A month of a large site is a few thousand rows; well past that and a PDF
// stops being readable and the request stops being cheap. Callers are told to
// narrow the range rather than being handed a truncated report that looks
// complete.
const MAX_ROWS = 5000;

const fail = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};


/**
 * The site ids this report may cover, after applying both the caller's own
 * access and any site/supervisor filter they asked for.
 */
const resolveSiteIds = async ({ user, siteId, supervisorId }) => {
    const filter = { companyId: user.companyId ?? null };

    // Supervisors only ever see their own sites, whatever they ask for.
    if (user.role === ROLES.SUPERVISOR) {
        filter.supervisorId = user._id;
    } else if (supervisorId) {
        filter.supervisorId = String(supervisorId);
    }

    if (siteId) filter._id = String(siteId);

    const sites = await Site.find(filter).select("_id name code supervisorId");

    // Asking for a specific site that isn't visible must not silently widen to
    // "everything" -- say plainly that it isn't available.
    if (siteId && sites.length === 0) {
        throw fail("Site not found", 404);
    }

    return sites;
};


/**
 * Builds the report body shared by the JSON preview and every export format,
 * so a downloaded file can never disagree with what was previewed.
 */
async function buildLabourReport({ user, query }) {
    const { siteId, supervisorId, labourId, startDate, endDate } = query;

    if (!startDate || !endDate) {
        throw fail("startDate and endDate are required");
    }

    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
        throw fail("Dates must look like 2026-08-01");
    }

    if (startDate > endDate) {
        throw fail("startDate must be before endDate");
    }

    const sites = await resolveSiteIds({ user, siteId, supervisorId });

    const attendanceFilter = {
        siteId: { $in: sites.map((s) => s._id) },
        date: { $gte: startDate, $lte: endDate },
    };

    // Narrowing to one labourer still has to stay inside the sites above, so a
    // supervisor can't read another site's labour by passing its id.
    let labourDoc = null;
    if (labourId) {
        labourDoc = await Labour.findOne({
            _id: String(labourId),
            companyId: user.companyId ?? null,
        }).select("labourId fullName siteId").catch(() => null);

        if (!labourDoc || !sites.some((s) => String(s._id) === String(labourDoc.siteId))) {
            throw fail("Labour not found", 404);
        }

        attendanceFilter.labour = labourDoc._id;
    }

    const total = await LabourAttendance.countDocuments(attendanceFilter);
    if (total > MAX_ROWS) {
        throw fail(
            `That range covers ${total} records, which is more than this report can show at once (${MAX_ROWS}). Narrow the dates, or pick a single site or labourer.`
        );
    }

    const records = await LabourAttendance.find(attendanceFilter)
        .populate("labour", "labourId fullName")
        .populate("siteId", "name code")
        .populate("supervisorId", "empID fullName")
        .sort({ date: 1 });

    const rows = records.map((r) => ({
        date: r.date,
        labourId: r.labour?.labourId ?? "",
        labourName: r.labour?.fullName ?? "(deleted labour)",
        site: r.siteId?.name ?? "",
        siteCode: r.siteId?.code ?? "",
        supervisor: r.supervisorId?.fullName ?? "Unassigned",
        status: r.present ? "Present" : "Absent",
        punchIn: r.punchIn || "-",
        punchOut: r.punchOut || "-",
        workingHours: r.workingHours || 0,
    }));

    const presentCount = rows.filter((row) => row.status === "Present").length;
    const totalHours = rows.reduce((sum, row) => sum + row.workingHours, 0);

    // Named filters make the exported file self-describing -- a PDF on someone
    // else's desk has to say what it covers.
    let supervisorName = null;
    if (supervisorId) {
        const sup = await User.findOne({
            _id: String(supervisorId),
            companyId: user.companyId ?? null,
        }).select("fullName").catch(() => null);
        supervisorName = sup?.fullName ?? null;
    }

    const site = siteId ? sites[0] : null;

    return {
        filters: {
            startDate,
            endDate,
            site: site ? `${site.name} (${site.code})` : "All sites",
            supervisor: supervisorName || (user.role === ROLES.SUPERVISOR ? user.fullName : "All supervisors"),
            labour: labourDoc ? `${labourDoc.fullName} (${labourDoc.labourId})` : "All labour",
        },
        generatedAt: new Date().toISOString(),
        generatedBy: user.fullName,
        totals: {
            records: rows.length,
            present: presentCount,
            absent: rows.length - presentCount,
            workingHours: Number(totalHours.toFixed(2)),
        },
        rows,
    };
}


/* =========================
   EXPORT HELPERS
========================= */

// Quotes anything a spreadsheet would otherwise mangle.
function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(fields) {
    return fields.map(csvEscape).join(",") + "\r\n";
}

function buildCsvString(report) {
    let out = "";

    out += csvRow(["LABOUR ATTENDANCE REPORT"]);
    out += csvRow(["Period", `${report.filters.startDate} to ${report.filters.endDate}`]);
    out += csvRow(["Site", report.filters.site]);
    out += csvRow(["Supervisor", report.filters.supervisor]);
    out += csvRow(["Labour", report.filters.labour]);
    out += csvRow(["Generated On", new Date(report.generatedAt).toLocaleString()]);
    out += csvRow(["Generated By", report.generatedBy]);
    out += csvRow([]);

    out += csvRow(["Date", "Labour ID", "Labour Name", "Site", "Supervisor", "Status", "Punch In", "Punch Out", "Working Hours"]);
    report.rows.forEach((r) => {
        out += csvRow([r.date, r.labourId, r.labourName, r.site, r.supervisor, r.status, r.punchIn, r.punchOut, r.workingHours]);
    });

    out += csvRow([]);
    out += csvRow(["TOTALS"]);
    out += csvRow(["Total Records", report.totals.records]);
    out += csvRow(["Present", report.totals.present]);
    out += csvRow(["Absent", report.totals.absent]);
    out += csvRow(["Total Working Hours", report.totals.workingHours]);

    return out;
}

async function buildExcelBuffer(report) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "StaffTrack";
    workbook.created = new Date();

    const infoSheet = workbook.addWorksheet("Report Info");
    infoSheet.columns = [
        { header: "Field", key: "field", width: 26 },
        { header: "Value", key: "value", width: 44 },
    ];
    infoSheet.addRows([
        { field: "Reporting Period", value: `${report.filters.startDate} to ${report.filters.endDate}` },
        { field: "Site", value: report.filters.site },
        { field: "Supervisor", value: report.filters.supervisor },
        { field: "Labour", value: report.filters.labour },
        { field: "Report Generated On", value: new Date(report.generatedAt).toLocaleString() },
        { field: "Generated By", value: report.generatedBy },
    ]);
    infoSheet.getRow(1).font = { bold: true };

    const sheet = workbook.addWorksheet("Attendance");
    sheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Labour ID", key: "labourId", width: 14 },
        { header: "Labour Name", key: "labourName", width: 26 },
        { header: "Site", key: "site", width: 24 },
        { header: "Supervisor", key: "supervisor", width: 22 },
        { header: "Status", key: "status", width: 12 },
        { header: "Punch In", key: "punchIn", width: 12 },
        { header: "Punch Out", key: "punchOut", width: 12 },
        { header: "Working Hours", key: "workingHours", width: 16 },
    ];
    report.rows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };

    const totalsSheet = workbook.addWorksheet("Totals");
    totalsSheet.columns = [
        { header: "Metric", key: "metric", width: 26 },
        { header: "Value", key: "value", width: 18 },
    ];
    totalsSheet.addRows([
        { metric: "Total Records", value: report.totals.records },
        { metric: "Present", value: report.totals.present },
        { metric: "Absent", value: report.totals.absent },
        { metric: "Total Working Hours", value: report.totals.workingHours },
    ]);
    totalsSheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
}

function writePdfReport(doc, report) {
    doc.fontSize(16).text("Labour Attendance Report", { align: "center" });
    doc.fontSize(9).fillColor("#555").text(
        `Generated on ${new Date(report.generatedAt).toLocaleString()} by ${report.generatedBy}`,
        { align: "center" }
    );
    doc.fillColor("#000");
    doc.moveDown();

    doc.fontSize(12).text("1. Report Filters", { underline: true });
    doc.fontSize(10);
    doc.text(`Period: ${report.filters.startDate} to ${report.filters.endDate}`);
    doc.text(`Site: ${report.filters.site}`);
    doc.text(`Supervisor: ${report.filters.supervisor}`);
    doc.text(`Labour: ${report.filters.labour}`);
    doc.moveDown();

    doc.fontSize(12).text("2. Totals", { underline: true });
    doc.fontSize(10);
    doc.text(`Total Records: ${report.totals.records}`);
    doc.text(`Present: ${report.totals.present}`);
    doc.text(`Absent: ${report.totals.absent}`);
    doc.text(`Total Working Hours: ${report.totals.workingHours}`);
    doc.moveDown();

    doc.fontSize(12).text("3. Attendance Records", { underline: true });
    doc.fontSize(9);

    if (report.rows.length === 0) {
        doc.text("No attendance records in this period.");
        return;
    }

    report.rows.forEach((r) => {
        doc.text(
            `${r.date}  |  ${r.labourName} (${r.labourId})  |  ${r.site}  |  ${r.supervisor}  |  ` +
            `${r.status}  |  In: ${r.punchIn}  |  Out: ${r.punchOut}  |  ${r.workingHours} hrs`
        );
    });
}


// ==========================
// PREVIEW (JSON)
// ==========================
exports.getLabourReport = async (req, res) => {
    try {
        const report = await buildLabourReport({ user: req.user, query: req.query });
        return res.status(200).json({ success: true, report });
    } catch (error) {
        const status = error.status || 500;
        if (status === 500) console.error("labour report error:", error);
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Server error" : error.message,
        });
    }
};


// ==========================
// EXPORT (xlsx / csv / pdf)
// ==========================
exports.exportLabourReport = async (req, res) => {
    try {
        const { format } = req.query;
        const report = await buildLabourReport({ user: req.user, query: req.query });

        const filenameBase = `labour-report-${report.filters.startDate}_to_${report.filters.endDate}`;

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
        const status = error.status || 500;
        if (status === 500) console.error("labour report export error:", error);
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Server error" : error.message,
        });
    }
};

// Exported for tests and for the dashboard work in Feature 11.
exports.buildLabourReport = buildLabourReport;
