const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

module.exports = async function (req, res, next) {
  try {
    // Try to get token from HTTP-Only cookie as adminToken
    const token = req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({ message: "No admin token provided" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user and ensure they are admin
    const user = await User.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Set req.user for use in routes
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid admin token" });
    }
    console.error("Error in adminMiddleware:", error);
    res.status(500).json({ message: "Server error checking admin status" });
  }
};
