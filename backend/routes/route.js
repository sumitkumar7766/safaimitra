const express = require("express");
const router = express.Router();
const Route = require("../model/RouteModel");
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");
const Dustbin = require("../model/DustbinModel");

/* ================= REGISTER ROUTE ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, description, dustbins, assignedVehicleId } = req.body;
  const officeId = req.user.id;
  console.log("Route Register Attempt:", name, "Office:", officeId);

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Route name required hai",
    });
  }

  try {
    if (assignedVehicleId) {
      const vehicle = await Vehicle.findById(assignedVehicleId);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" });
      }

      const alreadyAssigned = await Route.findOne({
        assignedVehicleId,
        active: true,
      });

      if (alreadyAssigned) {
        return res.status(400).json({
          success: false,
          message: "Ye vehicle already kisi aur route me assigned hai",
        });
      }
    }

    const route = await Route.create({
      officeId,
      name,
      description: description || "",
      dustbins: dustbins || [],
      assignedVehicleId: assignedVehicleId || null,
      active: true,
    });

    await Office.findByIdAndUpdate(officeId, {
      $addToSet: { route: route._id },
    });

    // Populate for frontend display
    const populatedRoute = await Route.findById(route._id).populate("assignedVehicleId", "vehicleNumber type");

    // 🔥 SOCKET EMIT: New Route Created
    const io = req.app.get("io");
    io.emit("route_data_update", { 
      type: "ADD", 
      data: populatedRoute 
    });

    return res.json({
      success: true,
      message: "Route successfully registered",
      route: populatedRoute,
    });
  } catch (err) {
    console.error("Route Register Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET ROUTES LIST ================= */
router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;

  try {
    const routes = await Route.find({ officeId })
      .populate("assignedVehicleId", "vehicleNumber type")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      routes,
    });
  } catch (err) {
    console.error("Get Routes Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE ROUTE ================= */
router.delete("/delete/:routeId", officeAuth, async (req, res) => {
  const { routeId } = req.params;
  const officeId = req.user.id;

  try {
    const route = await Route.findOne({ _id: routeId, officeId });
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    if (route.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(
        route.assignedVehicleId,
        { $unset: { routeId: "" } }
      );
    }

    await Dustbin.updateMany(
      { routeId: routeId, officeId: officeId },
      { $unset: { routeId: "" } }
    );

    await Office.findByIdAndUpdate(officeId, {
      $pull: { route: route._id },
    });

    await Route.findByIdAndDelete(routeId);

    // 🔥 SOCKET EMIT: Route Deleted
    const io = req.app.get("io");
    io.emit("route_data_update", { 
      type: "DELETE", 
      id: routeId 
    });

    return res.json({ success: true, message: "Route successfully deleted" });
  } catch (err) {
    console.error("Delete Route Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= UPDATE ROUTE ================= */
router.put("/update/:routeId", officeAuth, async (req, res) => {
  const { routeId } = req.params;
  const officeId = req.user.id;
  const { name, description, assignedVehicleId } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: "Route name required hai" });
  }

  try {
    const route = await Route.findOne({ _id: routeId, officeId });
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    if (assignedVehicleId && assignedVehicleId !== String(route.assignedVehicleId)) {
      const alreadyAssigned = await Route.findOne({
        _id: { $ne: routeId },
        assignedVehicleId,
        active: true,
      });

      if (alreadyAssigned) {
        return res.status(400).json({
          success: false,
          message: "Ye vehicle already kisi aur route me assigned hai",
        });
      }

      if (route.assignedVehicleId) {
        await Vehicle.findByIdAndUpdate(route.assignedVehicleId, { $unset: { routeId: "" } });
      }

      await Vehicle.findByIdAndUpdate(assignedVehicleId, { routeId: routeId });
      route.assignedVehicleId = assignedVehicleId;
    }

    route.name = name;
    route.description = description || "";

    await route.save();

    const updatedRoute = await Route.findById(routeId)
      .populate("assignedVehicleId", "vehicleNumber type");

    // 🔥 SOCKET EMIT: Route Updated
    const io = req.app.get("io");
    io.emit("route_data_update", { 
      type: "UPDATE", 
      data: updatedRoute 
    });

    return res.json({
      success: true,
      message: "Route updated successfully",
      route: updatedRoute,
    });
  } catch (err) {
    console.error("Update Route Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= REMOVE VEHICLE ================= */
router.put("/remove-vehicle/:routeId", officeAuth, async (req, res) => {
  const { routeId } = req.params;
  const officeId = req.user.id;

  try {
    const route = await Route.findOne({ _id: routeId, officeId });
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    if (route.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(route.assignedVehicleId, {
        $unset: { routeId: "" },
      });
    }

    route.assignedVehicleId = null;
    await route.save();

    // Re-fetch to send clean object
    const updatedRoute = await Route.findById(routeId);

    // 🔥 SOCKET EMIT: Vehicle Removed (Update Route)
    const io = req.app.get("io");
    io.emit("route_data_update", { 
      type: "UPDATE", 
      data: updatedRoute 
    });

    res.json({ success: true, message: "Vehicle removed from route" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;