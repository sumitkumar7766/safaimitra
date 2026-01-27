const jwt = require("jsonwebtoken");

module.exports = function officeAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    console.log("OFFICE AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("DECODED OFFICE TOKEN:", decoded);

    if (decoded.role !== "office") {
      return res.status(403).json({ 
        success: false, 
        message: "Only office allowed" 
      });
    }

    req.user = decoded; // { id, role, name }
    next();
  } catch (err) {
    console.error("OFFICE JWT ERROR:", err.message);
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
};
