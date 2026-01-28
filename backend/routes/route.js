const express = require("express");
const router = express.Router();
const Route = require("../model/RouteModel");
const Vehicle = require("../model/VehicleModel");
const officeAuth = require("../middleware/officeAuth");

/* ================= REGISTER ROUTE ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, description, dustbins, assignedVehicleId } = req.body;
  const officeId = req.user.id; // token se aayega
  console.log("Route Register Attempt:", name, "Office:", officeId);

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Route name required hai",
    });
  }

  try {
    // Agar vehicle assign ho rahi hai to check karo
    if (assignedVehicleId) {
      const vehicle = await Vehicle.findById(assignedVehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      // Check: ye vehicle kisi aur active route me to assigned nahi hai
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

    return res.json({
      success: true,
      message: "Route successfully registered",
      route,
    });
  } catch (err) {
    console.error("Route Register Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= DELETE ROUTE ================= */
router.delete("/delete/:routeId", officeAuth, async (req, res) => {
  const { routeId } = req.params;
  const officeId = req.user.id;

  try {
    // 1. Route find karo (office verify ke saath)
    const route = await Route.findOne({ _id: routeId, officeId });
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found for this office",
      });
    }

    // 2. Agar kisi vehicle ko assigned hai, to us vehicle se route hata do
    if (route.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(
        route.assignedVehicleId,
        { $unset: { routeId: "" } } // agar vehicle me routeId field hai
      );
    }

    // 3. Route delete karo
    await Route.findByIdAndDelete(routeId);

    return res.json({
      success: true,
      message: "Route successfully deleted",
    });
  } catch (err) {
    console.error("Delete Route Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= UPDATE ROUTE ================= */
router.put("/update/:routeId", officeAuth, async (req, res) => {
  const { routeId } = req.params;
  const officeId = req.user.id;

  const { name, description, assignedVehicleId } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Route name required hai",
    });
  }

  try {
    // 1. Route find karo (office verify ke saath)
    const route = await Route.findOne({ _id: routeId, officeId });
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found for this office",
      });
    }

    // 2. Agar vehicle assign/change ho rahi hai
    if (assignedVehicleId && assignedVehicleId !== String(route.assignedVehicleId)) {
      // Check: ye vehicle kisi aur active route me to nahi hai
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

      // Purani vehicle se route unlink karo (agar thi)
      if (route.assignedVehicleId) {
        await Vehicle.findByIdAndUpdate(
          route.assignedVehicleId,
          { $unset: { routeId: "" } }
        );
      }

      // Nayi vehicle me routeId set karo
      await Vehicle.findByIdAndUpdate(
        assignedVehicleId,
        { routeId: routeId }
      );

      route.assignedVehicleId = assignedVehicleId;
    }

    // 3. Baaki fields update karo
    route.name = name;
    route.description = description || "";

    await route.save();

    const updatedRoute = await Route.findById(routeId)
      .populate("assignedVehicleId", "vehicleNumber type");

    return res.json({
      success: true,
      message: "Route updated successfully",
      route: updatedRoute,
    });
  } catch (err) {
    console.error("Update Route Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


module.exports = router;
