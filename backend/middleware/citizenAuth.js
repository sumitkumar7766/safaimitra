const jwt = require("jsonwebtoken");

module.exports = function citizenAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    // console.log("CITIZEN AUTH HEADER:", authHeader);

    // 1. Check karein ki token header mein hai ya nahi
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Access Denied: No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];

    // 2. Token ko verify karein
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("DECODED CITIZEN TOKEN:", decoded);

    // 3. Role check karein (Ensure payload mein 'citizen' role ho)
    // Note: Agar aapne JWT generate karte waqt role "citizen" rakha hai to wahi use karein
    if (decoded.role !== "Citizen") {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: Only Citizens allowed" 
      });
    }

    // 4. Request object mein user data attach karein
    req.user = decoded;
    next();
    
  } catch (err) {
    console.error("JWT ERROR (Citizen):", err.message);
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
};