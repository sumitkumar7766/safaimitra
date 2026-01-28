const express = require("express");
const router = express.Router();
const Office = require("../model/OfficeModel");
const Staff = require("../model/StaffModel");
const Vehicle = require("../model/VehicleModel");
const Route = require("../model/RouteModel");
const Dustbin = require("../model/DustbinModel");
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
      latitude,
      longitude,
    } = req.body;

    if (
      !stateName ||
      !cityName ||
      !officeName ||
      !adminName ||
      !adminEmail ||
      !password ||
      latitude == null ||
      longitude == null
    ) {
      return res.status(400).json({ message: "All fields including location are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Geo validation
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      return res.status(400).json({
        message: "Invalid coordinates. Latitude -90 to 90, Longitude -180 to 180",
      });
    }

    const newOffice = new Office({
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      username: adminEmail, // login ke liye
      status: status || "Active",

      latitude: lat,
      longitude: lng,
      location: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON order
      },
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
        latitude: office.latitude,
        longitude: office.longitude,
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
        _id: o._id,
        id: o._id.toString(),
        stateName: o.stateName,
        cityName: o.cityName,
        officeName: o.officeName,
        adminName: o.adminName,
        adminEmail: o.adminEmail,
        username: o.username,
        status: o.status,
        latitude: o.latitude,
        longitude: o.longitude,
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

// DELETE office + cascade data
router.delete("/delete/:id", adminAuth, async (req, res) => {
  try {
    const officeId = req.params.id;

    const office = await Office.findById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    await Staff.deleteMany({ officeId });
    await Vehicle.deleteMany({ officeId });
    await Route.deleteMany({ officeId });
    await Dustbin.deleteMany({ officeId });
    await Office.findByIdAndDelete(officeId);

    return res.json({
      success: true,
      message: "Office aur usse related saara data successfully deleted",
    });
  } catch (err) {
    console.error("Delete Office Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update office detail
// UPDATE OFFICE
router.put("/update/:id", adminAuth, async (req, res) => {
  try {
    const officeId = req.params.id;

    const {
      stateName,
      cityName,
      officeName,
      adminName,
      adminEmail,
      status,
      latitude,
      longitude,
    } = req.body;

    const office = await Office.findById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    let lat = office.latitude;
    let lng = office.longitude;

    if (latitude != null && longitude != null) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 || lat > 90 ||
        lng < -180 || lng > 180
      ) {
        return res.status(400).json({
          message: "Invalid coordinates. Latitude -90 to 90, Longitude -180 to 180",
        });
      }
    }

    // Fields update
    office.stateName = stateName ?? office.stateName;
    office.cityName = cityName ?? office.cityName;
    office.officeName = officeName ?? office.officeName;
    office.adminName = adminName ?? office.adminName;
    office.adminEmail = adminEmail ?? office.adminEmail;
    office.status = status ?? office.status;

    // Location update
    office.latitude = lat;
    office.longitude = lng;
    office.location = {
      type: "Point",
      coordinates: [lng, lat],
    };

    await office.save();

    return res.json({
      success: true,
      message: "Office updated successfully",
      office,
    });
  } catch (err) {
    console.error("Update Office Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;