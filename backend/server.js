const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");

const employeeRoutes = require("./src/routes/employeeRoutes");

const attendanceRoutes = require("./src/routes/attendanceRoutes");

const payrollRoutes = require("./src/routes/payrollRoutes")

const salarySlipRoutes = require("./src/routes/salarySlipRoutes");

const travelRoutes = require("./src/routes/travelRoutes")

const leaveRoutes = require("./src/routes/leaveRoutes");

const settingsRoutes = require("./src/routes/settingsRoutes");

const reportRoutes = require("./src/routes/reportRoutes");

const companyRoutes = require("./src/routes/companyRoutes");

const holidayRoutes = require("./src/routes/holidayRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({limit:"10mb", extended: true}));

app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.get("/", (req, res) => {
    res.send("API Running...");
});

app.use("/api/attendance", attendanceRoutes);

app.use("/api/payroll", payrollRoutes);

app.use("/api/salary-slip", salarySlipRoutes);

app.use("/api/travel",travelRoutes)

app.use("/api/leave", leaveRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/report", reportRoutes);

app.use("/api/companies", companyRoutes);

app.use("/api/holidays", holidayRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
});