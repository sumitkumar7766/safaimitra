const express = require("express");
const router = express.Router();
const Office = require("../model/OfficeModel");
const bcrypt = require("bcrypt");
const adminAuth = require("../middleware/adminAuth");

// Manual Office Registration
router.post("/register", adminAuth, async (req, res) => {
  try {
    const {
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      password,
      status,
    } = req.body;

    if (
      !stateName ||
      !cityName ||
      !officeName ||
      !adminName ||
      !adminEmail ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newOffice = new Office({
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      username: adminEmail, // login ke liye
      status: status || "Active",
    });

    // passport-local-mongoose method
    const office = await Office.register(newOffice, password);

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
    if (err.name === "UserExistsError") {
      return res.status(409).json({ message: "Office already exists" });
    }

    console.error("Error during office registration:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET all offices
router.get("/", adminAuth, async (req, res) => {
  try {
    const offices = await Office.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      offices: offices.map((o) => ({
        _id: o._id,          // raw Mongo id
        id: o._id.toString(),// friendly id for frontend
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


router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const office = await Office.findByIdAndDelete(req.params.id);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }
    res.json({ message: "Office deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
