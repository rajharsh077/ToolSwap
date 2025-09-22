const jwt = require("jsonwebtoken");
require("dotenv").config();


const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email ,name: user.name},
        process.env.JWT_SECRET, 
        { expiresIn: "1d" }
    );
};

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token, process.env.JWT_SECRET || "abcd1234", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        console.log("✅ Decoded token:", decoded);
        req.user = decoded;
        next();
    });
};

module.exports = { generateToken, authenticateToken };
