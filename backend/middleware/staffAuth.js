const jwt = require("jsonwebtoken");

module.exports = function staffAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    console.log("STAFF AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("DECODED STAFF TOKEN:", decoded);

    // Staff roles allowed: driver, helper, supervisor
    if (!["driver", "helper", "supervisor"].includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: "Only staff allowed",
      });
    }

    req.user = decoded; // { id, role, name, officeId }
    next();
  } catch (err) {
    console.error("STAFF JWT ERROR:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
