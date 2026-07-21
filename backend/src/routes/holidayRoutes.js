const express = require("express");
const router = express.Router();

const { getHolidays, createHoliday, deleteHoliday } = require("../controllers/holidayController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getHolidays);
router.post("/", protect, adminOnly, createHoliday);
router.delete("/:id", protect, adminOnly, deleteHoliday);

module.exports = router;
