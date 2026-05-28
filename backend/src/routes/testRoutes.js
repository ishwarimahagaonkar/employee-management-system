const express = require("express");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// EMPLOYEE + ADMIN
router.get(
    "/profile",
    protect,
    (req, res) => {

        res.json({
            message: "Protected profile route",
            user: req.user,
        });

    }
);


// ADMIN ONLY
router.get(
    "/admin",
    protect,
    adminOnly,
    (req, res) => {

        res.json({
            message: "Welcome Admin",
        });

    }
);

module.exports = router;