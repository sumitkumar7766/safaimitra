const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const Citizen = require("../model/CitizenModel");
const { off } = require("../model/AdminModel");

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  // Frontend se 'username' field mein phone number aayega
  const { username, password } = req.body;
  console.log("Citizen login attempt (Phone):", username);

  // 1. Validation check
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Mobile number aur Password dono required hain",
    });
  }

  try {
    // 2. passport-local-mongoose ka static authenticate method
    // Kyunki humne register ke waqt 'username: phone' kiya tha, 
    // toh ye function automatically database mein phone number check karega.
    Citizen.authenticate()(username, password, (err, user, info) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Server error during authentication",
        });
      }

      // 3. User nahi mila ya password galat hai
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Mobile number ya Password galat hai",
        });
      }

      // 4. JWT generate karo (Role 'Citizen' set kiya hai)
      const token = jwt.sign(
        { id: user._id, role: "Citizen", name: user.fullName },
        process.env.JWT_SECRET || "AapkaSecretKey", // Environment variable use karein
        { expiresIn: "7d" }
      );

      // 5. Success Response
      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          officeId: user.officeId,
          fullName: user.fullName,
          phone: user.phone,
          role: "Citizen",
        },
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Catch error: " + err.message,
    });
  }
});

// Backend: auth.js ya citizen.js mein
router.post("/logout", (req, res) => {
  console.log("Citizen logout attempt");

  // Browser se token wali cookie ko clear karna
  res.clearCookie("token", {
    path: "/",
  });

  res.clearCookie("role", {
    path: "/",
  });

  return res.json({
    success: true,
    message: "Citizen logout successful",
  });
});

module.exports = router;