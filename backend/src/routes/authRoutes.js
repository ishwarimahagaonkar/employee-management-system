const express = require("express");

const {
    register,
    login,
    logout,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);
// ✅ ADD THIS TEST ROUTE HERE
router.get("/test", (req, res) => {
  res.json({ message: "Backend working" });
});


router.post("/logout", logout);

module.exports = router;