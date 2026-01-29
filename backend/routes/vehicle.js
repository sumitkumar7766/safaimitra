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

/* ================= UPDATE VEHICLE ================= */
router.put("/update/:vehicleId", officeAuth, async (req, res) => {
  const { vehicleId } = req.params;
  const officeId = req.user.id;

  const { vehicleNumber, type, status } = req.body;

  try {
    // 1. Vehicle find karo (office ownership verify)
    const vehicle = await Vehicle.findOne({ _id: vehicleId, officeId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this office",
      });
    }

    // 2. Agar vehicle number change ho raha hai to duplicate check
    if (vehicleNumber && vehicleNumber !== vehicle.vehicleNumber) {
      const exists = await Vehicle.findOne({ vehicleNumber });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Is vehicle number se pehle hi ek vehicle registered hai",
        });
      }
    }

    // 3. Update fields
    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber;
    if (type !== undefined) vehicle.type = type;
    if (status) vehicle.status = status; // "Active" | "Inactive"

    await vehicle.save();

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
    // 1. Vehicle find karo (verify office ownership)
    const vehicle = await Vehicle.findOne({ _id: vehicleId, officeId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this office",
      });
    }

    // 2. Office se vehicleId remove karo (agar Office schema me array hai)
    await Office.findByIdAndUpdate(
      officeId,
      { $pull: { vehicles: vehicle._id } }
    );

    // 3. Agar kisi staff se linked hai to us staff ko unlink karo
    await Staff.updateMany(
      { assignedVehicleId: vehicle._id },
      { $set: { assignedVehicleId: null } }
    );

    // 4. Vehicle delete karo
    await Vehicle.findByIdAndDelete(vehicleId);

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
