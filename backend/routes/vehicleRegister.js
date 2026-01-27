const express = require("express");
const router = express.Router();
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");

/* ================= VEHICLE REGISTER ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { officeId, vehicleNumber, type } = req.body;

  if (!officeId || !vehicleNumber) {
    return res.status(400).json({
      success: false,
      message: "OfficeId aur Vehicle Number required hai",
    });
  }

  try {
    const vehicle = await Vehicle.create({
      officeId,
      vehicleNumber,
      type,
    });

    // Office ke andar vehicleId push karo
    await Office.findByIdAndUpdate(
      officeId,
      { $push: { vehicles: vehicle._id } }
    );

    return res.json({
      success: true,
      message: "Vehicle successfully registered",
      vehicle,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= GET VEHICLES BY OFFICE ================= */
router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;

  try {
    const vehicles = await Vehicle.find({ officeId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      vehicles,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= UPDATE VEHICLE LIVE LOCATION ================= */
router.post("/location/update", async (req, res) => {
  const { vehicleId, latitude, longitude } = req.body;

  if (!vehicleId || latitude == null || longitude == null) {
    return res.status(400).json({
      success: false,
      message: "vehicleId, latitude, longitude required",
    });
  }

  try {
    await Vehicle.findByIdAndUpdate(vehicleId, {
      latitude,
      longitude,
      status: "Active",
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Location updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
