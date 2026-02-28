const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Try to get token from HTTP-Only cookie first, fallback to Authorization header
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader; // Legacy fallback
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
