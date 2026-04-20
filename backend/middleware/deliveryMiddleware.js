const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

module.exports = async function (req, res, next) {
  try {
    // Try from deliveryToken cookie
    const token = req.cookies?.deliveryToken;

    if (!token) {
      return res.status(401).json({ message: "No delivery agent token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.role !== "delivery_partner") {
      return res.status(403).json({ message: "Access denied. Delivery agent role required." });
    }

    req.user = { ...decoded, id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid delivery agent token" });
    }
    console.error("Error in deliveryMiddleware:", error);
    res.status(500).json({ message: "Server error checking delivery agent status" });
  }
};
