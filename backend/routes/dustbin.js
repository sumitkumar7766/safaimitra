const express = require("express");
const router = express.Router();
const Dustbin = require("../model/DustbinModel");
const Route = require("../model/RouteModel");
const officeAuth = require("../middleware/officeAuth");

/* ================= REGISTER DUSTBIN ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, area, latitude, longitude, status, routeId } = req.body;
  const officeId = req.user.id;

  if (!name || latitude == null || longitude == null) {
    return res.status(400).json({
      success: false,
      message: "Name, Latitude aur Longitude required hai",
    });
  }

  try {
    // Agar route diya gaya hai to verify karo
    if (routeId) {
      const route = await Route.findOne({ _id: routeId, officeId });
      if (!route) {
        return res.status(404).json({
          success: false,
          message: "Route not found for this office",
        });
      }
    }

    const dustbin = await Dustbin.create({
      officeId,
      name,
      area: area || "",
      latitude,
      longitude,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON order
      },
      status: status || "clean",
      routeId: routeId || null,
      active: true,
    });

    return res.json({
      success: true,
      message: "Dustbin successfully registered",
      dustbin,
    });
  } catch (err) {
    console.error("Dustbin Register Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= LIST DUSTBINS ================= */
router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;

  try {
    const dustbins = await Dustbin.find({ officeId })
      .populate("routeId", "name")
      .sort({ createdAt: -1 });

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

/* ================= UPDATE DUSTBIN ================= */
router.put("/update/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const officeId = req.user.id;

  const { name, area, latitude, longitude, status, routeId } = req.body;

  try {
    const dustbin = await Dustbin.findOne({ _id: dustbinId, officeId });
    if (!dustbin) {
      return res.status(404).json({
        success: false,
        message: "Dustbin not found for this office",
      });
    }

    // Route verify
    if (routeId) {
      const route = await Route.findOne({ _id: routeId, officeId });
      if (!route) {
        return res.status(404).json({
          success: false,
          message: "Route not found for this office",
        });
      }
    }

    dustbin.name = name ?? dustbin.name;
    dustbin.area = area ?? dustbin.area;
    dustbin.latitude = latitude ?? dustbin.latitude;
    dustbin.longitude = longitude ?? dustbin.longitude;
    dustbin.status = status ?? dustbin.status;
    dustbin.routeId = routeId ?? dustbin.routeId;

    await dustbin.save();

    return res.json({
      success: true,
      message: "Dustbin updated successfully",
      dustbin,
    });
  } catch (err) {
    console.error("Update Dustbin Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= DELETE DUSTBIN ================= */
router.delete("/delete/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const officeId = req.user.id;

  try {
    const dustbin = await Dustbin.findOne({ _id: dustbinId, officeId });
    if (!dustbin) {
      return res.status(404).json({
        success: false,
        message: "Dustbin not found for this office",
      });
    }

    await Dustbin.findByIdAndDelete(dustbinId);

    return res.json({
      success: true,
      message: "Dustbin successfully deleted",
    });
  } catch (err) {
    console.error("Delete Dustbin Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
