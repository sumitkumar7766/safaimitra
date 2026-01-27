const express = require("express");
const router = express.Router();
const Office = require("../model/OfficeModel");
const jwt = require("jsonwebtoken");
const officeAuth = require("../middleware/officeAuth");

const JWT_SECRET = process.env.SECRET_KEY;

// POST office login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Office login attempt Office:", username);

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username aur Password must be required",
    });
  }

  try {
    Office.authenticate()(username, password, (err, user, info) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Server error during authentication",
        });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Username and Password May wrong",
        });
      }

      const token = jwt.sign(
        { id: user._id, role: "office", name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Office login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: "office",
        },
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
    console.log("Office Login Error:", err);
  }
});

// POST office logout
router.post("/logout", (req, res) => {
  console.log("Office logout attempt");

  res.clearCookie("token", {
    path: "/",
  });

  return res.json({
    success: true,
    message: "Office logout successful",
  });
});


router.get("/userdata", officeAuth, async (req, res) => {
  // 1. Token nikalna
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    // 2. Token Verify karna
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Database se User dhundna (Password hata kar)
    // Note: 'decoded.id' use karein agar aapne token sign karte waqt { id: user._id } use kiya tha
    const user = await Office.findById(decoded.id).select("-password"); 
    console.log("Fetched User Data:", user);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 4. User data frontend ko bhejna
    return res.json({ 
      success: true, 
      user: user 
    });

  } catch (err) {
    console.error("User Data Fetch Error:", err);
    return res.status(401).json({ success: false, message: "Invalid or Expired Token" });
  }
});

module.exports = router;
