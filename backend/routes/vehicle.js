const express = require("express");
const router = express.Router();
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");
const Staff = require("../model/StaffModel");

/* ================= VEHICLE REGISTER ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { officeId, vehicleNumber, type } = req.body;

  if (!officeId || !vehicleNumber) {
    return res.status(400).json({
      success: false,
      message: "officeId and vehicleNumber are required",
    });
  }

  try {
    const vehicle = await Vehicle.create({
      officeId,
      vehicleNumber,
      type,
      status: "Active",
      isOnline: false // Default
    });

    // Office ke andar vehicleId push karo
    await Office.findByIdAndUpdate(
      officeId,
      { $push: { vehicles: vehicle._id } }
    );

    // 🔥 SOCKET EMIT: Add to Vehicle List 🔥
    const io = req.app.get("io");
    io.emit("vehicle_list_update", { 
      type: "ADD", 
      data: vehicle 
    });

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

/* ================= UPDATE VEHICLE LIVE LOCATION (The most important part) ================= */
router.post("/location/update", async (req, res) => {
  const { vehicleId, latitude, longitude } = req.body;

  if (!vehicleId || latitude == null || longitude == null) {
    return res.status(400).json({
      success: false,
      message: "vehicleId, latitude, longitude required",
    });
  }

  try {
    // Update DB and Return New Document ({new: true})
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId, 
      {
        latitude,
        longitude,
        status: "Active",
        isOnline: true,
        lastSeen: new Date(),
        location: {
            type: "Point",
            coordinates: [longitude, latitude] // GeoJSON format [lng, lat]
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if(updatedVehicle) {
        // 🔥 SOCKET EMIT: Move Map Marker Instantly 🔥
        const io = req.app.get("io");
        io.emit("vehicle_location_update", updatedVehicle);
    }

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

/* ================= UPDATE VEHICLE DETAILS ================= */
router.put("/update/:vehicleId", officeAuth, async (req, res) => {
  const { vehicleId } = req.params;
  const officeId = req.user.id;

  const { vehicleNumber, type, status } = req.body;

  try {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, officeId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this office",
      });
    }

    if (vehicleNumber && vehicleNumber !== vehicle.vehicleNumber) {
      const exists = await Vehicle.findOne({ vehicleNumber });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "This vehicle number is already registered",
        });
      }
    }

    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber;
    if (type !== undefined) vehicle.type = type;
    if (status) vehicle.status = status;

    await vehicle.save();

    // 🔥 SOCKET EMIT: Update List Details 🔥
    const io = req.app.get("io");
    io.emit("vehicle_list_update", { 
      type: "UPDATE", 
      data: vehicle 
    });

    return res.json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (err) {
    console.error("Update Vehicle Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


/* ================= DELETE VEHICLE ================= */
router.delete("/delete/:vehicleId", officeAuth, async (req, res) => {
  const { vehicleId } = req.params;
  const officeId = req.user.id;

  try {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, officeId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this office",
      });
    }

    await Office.findByIdAndUpdate(
      officeId,
      { $pull: { vehicles: vehicle._id } }
    );

    await Staff.updateMany(
      { assignedVehicleId: vehicle._id },
      { $set: { assignedVehicleId: null } }
    );

    await Vehicle.findByIdAndDelete(vehicleId);

    // 🔥 SOCKET EMIT: Remove from List & Map 🔥
    const io = req.app.get("io");
    io.emit("vehicle_list_update", { 
      type: "DELETE", 
      id: vehicleId 
    });

    return res.json({
      success: true,
      message: "Vehicle successfully deleted",
    });
  } catch (err) {
    console.error("Delete Vehicle Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;