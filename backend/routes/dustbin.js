const express = require("express");
const router = express.Router();
const Dustbin = require("../model/DustbinModel");
const Route = require("../model/RouteModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");
const upload = require("../utils/cloudinaryConfig");
const staffAuth = require("../middleware/staffAuth");
const Complaint = require("../model/ComplaintModel");
const mongoose = require("mongoose");

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

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

router.post("/mark-clean", staffAuth, upload.single("image"), async (req, res) => {
  try {
    const { dustbinId, status, latitude, longitude, complaintId } = req.body;

    console.log("Cleaning Request:", { dustbinId, complaintId, status });
    console.log("Uploaded File:", req.body);

    // ✅ Validation Sahi Hai
    if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
    if (!dustbinId) return res.status(400).json({ success: false, message: "Dustbin ID missing" });

    const dustbin = await Dustbin.findById(dustbinId);
    if (!dustbin) return res.status(404).json({ success: false, message: "Dustbin not found" });

    // ✅ Distance Logic Sahi Hai
    // if (latitude && longitude) {
    //   const dist = getDistanceFromLatLonInM(
    //     parseFloat(latitude),
    //     parseFloat(longitude),
    //     dustbin.latitude,
    //     dustbin.longitude
    //   );

    //   console.log(`Driver Distance: ${dist} meters`);

    //   if (dist > 100) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `Too far! You are ${Math.round(dist)}m away. Go closer (100m).`
    //     });
    //   }
    // } else {
    //   return res.status(400).json({ success: false, message: "Location data missing!" });
    // }

    const imageUrl = req.file.path;

    // ✅ Complaint Logic Sahi Hai (Resolved + Inactive)
    if (complaintId && complaintId !== "undefined") {
      await Complaint.findByIdAndUpdate(complaintId, {
        status: "resolved", resolvedAt: new Date(), active: false, ComimageUrl: imageUrl
      });

      // 2. 🔥 SMART LOGIC: Agar same dustbin ki aur bhi complaints 'assigned' padi hain, unhe bhi resolve kar do
      // Isse grouping wala circle complete ho jata hai.
      await Complaint.updateMany(
        { dustbinId: dustbinId, status: "assigned" },
        {
          $set: { status: "resolved", resolvedAt: new Date(), active: false, ComimageUrl: imageUrl }
        }
      );
      console.log("✅ Complaint Resolved");
    }

    // ✅ Status Logic Sahi Hai
    const finalStatus = status === "suspecies" ? "suspecies" : "clean";

    // ✅ Dustbin Logic Sahi Hai (Daily Route count badhega isse)
    const updatedBin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      {
        status: finalStatus,
        imageUrl: imageUrl,
        lastCleanedAt: new Date()
      },
      { new: true }
    );

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

/* ================= MANUAL UPDATE STATUS (No Image) ================= */
// Frontend route: /dustbin/update-status/:id
router.put("/update-status/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const { status } = req.body; // Frontend sends { status: "clean" }

  try {
    // Check if dustbin exists
    const dustbin = await Dustbin.findById(dustbinId);

    if (!dustbin) {
      return res.status(404).json({
        success: false,
        message: "Dustbin not found",
      });
    }

    // Update status
    dustbin.status = status || "clean";

    // Agar status clean hai, to timestamp update karo
    if (status === "clean") {
      dustbin.lastCleanedAt = new Date();
    }

    await dustbin.save();

    return res.json({
      success: true,
      message: "Dustbin status updated manually",
      data: dustbin,
    });
  } catch (err) {
    console.error("Manual Status Update Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ============================================================ */
/* 👇 DRIVER SKIP/UPDATE ROUTE (No Office Auth) 👇              */
/* ============================================================ */
router.put("/driver-update-status/:dustbinId", staffAuth, async (req, res) => {
  try {
    const { dustbinId } = req.params;
    const { status } = req.body;

    // Check header for basic safety (Optional: You can add staffAuth middleware if you have it)
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const updatedBin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      {
        status: status,       // "skiped" save hoga
        imageUrl: null,       // Image null kar di
        lastCleanedAt: new Date() // Time update
      },
      { new: true }
    );

    if (!updatedBin) {
      return res.status(404).json({ success: false, message: "Dustbin not found" });
    }

    res.json({ success: true, data: updatedBin });

  } catch (err) {
    console.error("Driver Update Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
