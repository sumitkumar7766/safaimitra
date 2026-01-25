const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED TOKEN:", decoded);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
