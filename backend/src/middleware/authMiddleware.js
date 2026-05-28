const jwt = require("jsonwebtoken");


// VERIFY TOKEN
exports.protect = async (req, res, next) => {

    try {

        let token;

        // CHECK TOKEN
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {

            token = req.headers.authorization.split(" ")[1];

        }

        // NO TOKEN
        if (!token) {
            return res.status(401).json({
                message: "Not authorized, no token",
            });
        }

        // VERIFY TOKEN
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // SAVE USER INFO
        req.user = decoded;

        next();

    } catch (error) {

        res.status(401).json({
            message: "Not authorized",
        });

    }
};


// ADMIN ONLY
exports.adminOnly = (req, res, next) => {

    if (req.user.role !== "admin") {

        return res.status(403).json({
            message: "Admin access only",
        });

    }

    next();
};