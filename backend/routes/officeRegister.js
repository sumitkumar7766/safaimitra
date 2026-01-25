const express = require("express");
const router = express.Router();
const Office = require("../model/OfficeModel");
const bcrypt = require("bcrypt");

// Manual Office Registration
router.post("/register", async (req, res) => {
  try {
    console.log("Office registration attempt:", req.body);
    const {
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      username,
      password,
      status,
    } = req.body;

    if (
      !stateName ||
      !cityName ||
      !officeName ||
      !adminName ||
      !adminEmail ||
      !username ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if office/admin already exists
    const existing = await Office.findOne({
      $or: [{ adminEmail }, { username }],
    });

    if (existing) {
      return res.status(409).json({ message: "Office already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newOffice = new Office({
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      username,
      password: hashedPassword,
      status: status || "Active",
    });

    const office = await newOffice.save();

    res.status(201).json({
      message: "Office registered successfully",
      office: {
        id: office._id,
        stateName: office.stateName,
        cityName: office.cityName,
        officeName: office.officeName,
        adminName: office.adminName,
        adminEmail: office.adminEmail,
        username: office.username,
        status: office.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all offices
router.get("/", async (req, res) => {
  try {
    const offices = await Office.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      offices: offices.map((o) => ({
        id: o._id,
        stateName: o.stateName,
        cityName: o.cityName,
        officeName: o.officeName,
        adminName: o.adminName,
        adminEmail: o.adminEmail,
        username: o.username,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


module.exports = router;
