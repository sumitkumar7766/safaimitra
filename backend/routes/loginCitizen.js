const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const Citizen = require("../model/CitizenModel");
const { off } = require("../model/AdminModel");

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  const { username, phone, email, password } = req.body;
  const loginIdentifier = (username || phone || email || "").toString().trim();
  console.log("Citizen login attempt:", loginIdentifier);

  // 1. Validation check
  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Mobile number/Email aur Password dono required hain",
    });
  }

  try {
    // 2. Flexible lookup: match by username, phone, or email
    const cleanPhone = loginIdentifier.replace(/[^0-9]/g, "");
    const user = await Citizen.findOne({
      $or: [
        { username: loginIdentifier },
        { phone: loginIdentifier },
        { email: loginIdentifier.toLowerCase() },
        ...(cleanPhone ? [{ phone: cleanPhone }, { username: cleanPhone }] : []),
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Mobile number ya Password galat hai",
      });
    }

    // 3. Authenticate with passport-local-mongoose using found user's actual username
    Citizen.authenticate()(user.username, password, (err, authUser, info) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Server error during authentication",
        });
      }

      // 4. User nahi mila ya password galat hai
      if (!authUser) {
        return res.status(401).json({
          success: false,
          message: "Mobile number ya Password galat hai",
        });
      }

      // 5. JWT generate karo (Role 'Citizen')
      const token = jwt.sign(
        { id: authUser._id, role: "Citizen", name: authUser.fullName },
        process.env.JWT_SECRET || "AapkaSecretKey",
        { expiresIn: "7d" }
      );

      // 6. Success Response
      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: authUser._id,
          _id: authUser._id,
          officeId: authUser.officeId,
          fullName: authUser.fullName,
          name: authUser.fullName,
          phone: authUser.phone,
          email: authUser.email,
          cityName: authUser.cityName,
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