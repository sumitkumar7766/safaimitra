const express = require("express");
const router = express.Router();
const Dustbin = require("../model/DustbinModel");
const Route = require("../model/RouteModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");
const upload = require("../utils/cloudinaryConfig");

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
    let route = null;

    // Agar route diya gaya hai to verify karo
    if (routeId) {
      route = await Route.findOne({ _id: routeId, officeId });
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

    // 🔗 Route ke andar dustbin ka ID push karo
    if (routeId) {
      await Route.findByIdAndUpdate(routeId, {
        $addToSet: { dustbins: dustbin._id }, // duplicate se bachaata hai
      });
    }

    // 🏢 Office ke andar bhi dustbin ID save karo
    await Office.findByIdAndUpdate(officeId, {
      $addToSet: { dustbins: dustbin._id },
    });

    return res.json({
      success: true,
      message: "Dustbin successfully registered and linked to route",
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

    // Agar route change ho raha hai
    if (routeId && String(routeId) !== String(dustbin.routeId)) {

      // Naya route verify karo
      const newRoute = await Route.findOne({ _id: routeId, officeId });
      if (!newRoute) {
        return res.status(404).json({
          success: false,
          message: "Route not found for this office",
        });
      }

      // Purane route se hatao (agar pehle assigned tha)
      if (dustbin.routeId) {
        await Route.findByIdAndUpdate(dustbin.routeId, {
          $pull: { dustbins: dustbin._id },
        });
      }

      // Naye route me add karo
      await Route.findByIdAndUpdate(routeId, {
        $addToSet: { dustbins: dustbin._id },
      });

      // Dustbin me naya route set karo
      dustbin.routeId = routeId;
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

    // 🔗 Agar kisi route se linked hai to waha se bhi hatao
    if (dustbin.routeId) {
      await Route.findByIdAndUpdate(dustbin.routeId, {
        $pull: { dustbins: dustbin._id },
      });
    }

    // 🏢 Office ke andar se bhi dustbin hatao (agar office me array hai)
    await Office.findByIdAndUpdate(officeId, {
      $pull: { dustbins: dustbin._id },
    });

    // 🗑️ Ab dustbin delete karo
    await Dustbin.findByIdAndDelete(dustbinId);

    return res.json({
      success: true,
      message: "Dustbin successfully deleted and unlinked from route",
    });
  } catch (err) {
    console.error("Delete Dustbin Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/mark-clean", upload.single("image"), async (req, res) => {
  try {
    // Extract status from body (sent by frontend)
    const { dustbinId, status } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    if (!dustbinId) {
      return res.status(400).json({ success: false, message: "Dustbin ID missing" });
    }

    const imageUrl = req.file.path;

    // Determine the status to save
    // If frontend sent "suspecies", use that. Otherwise default to "clean"
    const finalStatus = status === "suspecies" ? "suspecies" : "clean";

    // Update Database
    const updatedBin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      {
        status: finalStatus, // 👈 Saving the correct status
        imageUrl: imageUrl,
        lastCleanedAt: new Date()
      },
      { new: true }
    );

    if (!updatedBin) {
      return res.status(404).json({ success: false, message: "Dustbin not found" });
    }

    res.json({
      success: true,
      message: `Dustbin marked as ${finalStatus}`,
      data: updatedBin
    });

  } catch (err) {
    console.error("Mark Clean Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
