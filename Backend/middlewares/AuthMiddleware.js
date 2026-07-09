const jwt = require("jsonwebtoken");
require("dotenv").config();
const userModel = require("../models/users");


const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, name: user.name, isAdmin: Boolean(user.isAdmin) },
        process.env.JWT_SECRET || "ABC123", 
        { expiresIn: "1d" }
    );
};

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token, process.env.JWT_SECRET || "abcd1234", async (err, decoded) => {
        if (err) {
            console.error('❌ JWT verification failed:', err.message || err);
            return res.status(403).json({ message: "Invalid token" });
        }

        const userId = decoded.id || decoded._id || decoded.userId;
        const userName = decoded.username || decoded.name || decoded.email;

        console.log("✅ Decoded token:", { ...decoded, normalizedId: userId, normalizedName: userName });

        const user = await userModel.findById(userId).select("isSuspended isBanned");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        if (user.isBanned) {
            return res.status(403).json({ message: "Your account is banned" });
        }
        if (user.isSuspended) {
            return res.status(403).json({ message: "Your account is suspended" });
        }

        req.user = {
            ...decoded,
            id: userId,
            name: userName
        };

        next();
    });
};

module.exports = { generateToken, authenticateToken };
