const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const adminAuth = require("../middleware/adminAuth");
const { route } = require("./office");
const Citizen = require('../model/CitizenModel');
const Dustbin = require('../model/DustbinModel');
const citizenAuth = require("../middleware/citizenAuth");

router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      address,
      officeId,   // Frontend dropdown se aayega
      cityName,   // Frontend dropdown selection se aayega
      pincode,
      latitude,
      longitude
    } = req.body;

    // 1. Validation check (Optional but recommended)
    if (!officeId || !cityName) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid City/Office."
      });
    }

    // 2. Citizen ka data object create karein
    const citizenData = new Citizen({
      fullName,
      email,
      phone,
      username: phone, // Phone number hi username banega
      address,
      officeId,        // Link to the Office model
      cityName,        // Selected city name
      pincode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON: [lng, lat]
      },
    });

    // 3. passport-local-mongoose use karke register karein
    const registeredCitizen = await Citizen.register(citizenData, password);

    // 4. Register hone ke baad seedha login karwana
    req.login(registeredCitizen, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ success: false, message: "Registered but login failed." });
      }

      res.status(201).json({
        success: true,
        message: "Registration successful!",
        user: {
          id: registeredCitizen._id,
          fullName: registeredCitizen.fullName,
          username: registeredCitizen.username,
          cityName: registeredCitizen.cityName
        }
      });
    });

    console.log(`New Citizen Registered: ${registeredCitizen.username} for City: ${registeredCitizen.cityName}`);

  } catch (error) {
    // Duplicate Key Error Handling (Email, Phone, ya Username pehle se exist karta ho)
    if (error.code === 11000 || error.name === "UserExistsError") {
      return res.status(400).json({
        success: false,
        message: "User with this Email or Phone number already exists!"
      });
    }

    console.error("Registration route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration.",
      error: error.message
    });
  }
});

//get dustbin data
router.get("/dustbin/list/:officeId", citizenAuth, async (req, res) => {

  const { officeId } = req.params;

  try {
    const dustbins = await Dustbin.find({ officeId })
      .select("name area latitude longitude location status routeId binCode lastCleanedAt active")
      .populate("routeId", "name")
      .sort({ createdAt: -1 });

    console.log(`dustbin is ${dustbins}`);
    return res.json({
      success: true,
      dustbins,
    });
  } catch (err) {
    console.error("Get Dustbins Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;