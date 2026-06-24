const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");

const testRoutes = require("./src/routes/testRoutes");

const employeeRoutes = require("./src/routes/employeeRoutes");

const attendanceRoutes = require("./src/routes/attendanceRoutes");

const payrollRoutes = require("./src/routes/payrollRoutes")

const salarySlipRoutes = require("./src/routes/salarySlipRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({limit:"10mb", extended: true}));

app.use("/api/auth", authRoutes);

app.use("/api/test", testRoutes);

app.use("/api/employees", employeeRoutes);

app.get("/", (req, res) => {
    res.send("API Running...");
});

app.use("/api/attendance", attendanceRoutes);

app.use("/api/payroll", payrollRoutes);

app.use("/api/salary-slip", salarySlipRoutes);




const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});