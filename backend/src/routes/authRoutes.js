const express = require("express");

const {
    register,
    login,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);
// ✅ ADD THIS TEST ROUTE HERE
router.get("/test", (req, res) => {
  res.json({ message: "Backend working" });
});

module.exports = router;