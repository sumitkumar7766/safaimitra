const express = require("express");
const router = express.Router();
const Office = require("../model/OfficeModel");
const jwt = require("jsonwebtoken");
const officeAuth = require("../middleware/officeAuth");
const passport = require("passport");
const Staff = require("../model/StaffModel");
const staffAuth = require("../middleware/staffAuth");

const JWT_SECRET = process.env.SECRET_KEY;

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Staff login attempt:", username);

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username aur Password must be required",
    });
  }

  try {
    Staff.authenticate()(username, password, (err, user, info) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Server error during authentication",
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Username or Password wrong",
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive",
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,        // driver | helper | supervisor
          officeId: user.officeId,
          name: user.name,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Staff login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          officeId: user.officeId,
        },
      });
    });
  } catch (err) {
    console.log("Staff Login Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/logout", (req, res) => {
  console.log("Staff logout attempt");

  res.clearCookie("staffToken", {
    path: "/",
  });

  return res.json({
    success: true,
    message: "Staff logout successful",
  });
});

//get staf data send to the frontend
router.get("/userdata", staffAuth, async (req, res) => {
  // 1. Token nikalna
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    // 2. Token verify karna
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Database se Staff dhundhna (password hata kar)
    const staff = await Staff.findById(decoded.id).select("-password");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // 4. Staff data frontend ko bhejna
    return res.json({
      success: true,
      user: staff,
    });
  } catch (err) {
    console.error("Staff User Data Fetch Error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
});

module.exports = router;