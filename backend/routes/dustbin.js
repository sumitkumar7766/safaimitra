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
        coordinates: [longitude, latitude],
      },
      status: status || "clean",
      routeId: routeId || null,
      active: true,
    });

    if (routeId) {
      await Route.findByIdAndUpdate(routeId, {
        $addToSet: { dustbins: dustbin._id },
      });
    }

    await Office.findByIdAndUpdate(officeId, {
      $addToSet: { dustbins: dustbin._id },
    });

    // 🔥 SOCKET EMIT: Add Dustbin to Map
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "ADD", 
      data: dustbin 
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
// server.js mein io ko app par set karna zaroori hai
// app.set("io", io);

router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;
  
  try {
    const dustbins = await Dustbin.find({ officeId })
      .populate("routeId", "name")
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, dustbins });
  } catch (err) {
    console.error("Get Dustbins Error:", err);
    return res.status(500).json({ success: false, message: err.message });
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
      return res.status(404).json({ success: false, message: "Dustbin not found" });
    }

    if (routeId && String(routeId) !== String(dustbin.routeId)) {
      const newRoute = await Route.findOne({ _id: routeId, officeId });
      if (!newRoute) return res.status(404).json({ success: false, message: "Route not found" });

      if (dustbin.routeId) {
        await Route.findByIdAndUpdate(dustbin.routeId, { $pull: { dustbins: dustbin._id } });
      }
      await Route.findByIdAndUpdate(routeId, { $addToSet: { dustbins: dustbin._id } });
      dustbin.routeId = routeId;
    }

    dustbin.name = name ?? dustbin.name;
    dustbin.area = area ?? dustbin.area;
    dustbin.latitude = latitude ?? dustbin.latitude;
    dustbin.longitude = longitude ?? dustbin.longitude;
    dustbin.status = status ?? dustbin.status;

    await dustbin.save();

    // 🔥 SOCKET EMIT: Update Dustbin on Map
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "UPDATE", 
      data: dustbin 
    });

    return res.json({ success: true, message: "Dustbin updated successfully", dustbin });
  } catch (err) {
    console.error("Update Dustbin Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE DUSTBIN ================= */
router.delete("/delete/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const officeId = req.user.id;

  try {
    const dustbin = await Dustbin.findOne({ _id: dustbinId, officeId });
    if (!dustbin) {
      return res.status(404).json({ success: false, message: "Dustbin not found" });
    }

    if (dustbin.routeId) {
      await Route.findByIdAndUpdate(dustbin.routeId, { $pull: { dustbins: dustbin._id } });
    }

    await Office.findByIdAndUpdate(officeId, { $pull: { dustbins: dustbin._id } });
    await Dustbin.findByIdAndDelete(dustbinId);

    // 🔥 SOCKET EMIT: Remove Dustbin from Map
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "DELETE", 
      id: dustbinId 
    });

    return res.json({ success: true, message: "Dustbin successfully deleted" });
  } catch (err) {
    console.error("Delete Dustbin Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DRIVER MARK CLEAN ================= */
router.post("/mark-clean", staffAuth, upload.single("image"), async (req, res) => {
  try {
    const { dustbinId, status, complaintId } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
    if (!dustbinId) return res.status(400).json({ success: false, message: "Dustbin ID missing" });

    const dustbin = await Dustbin.findById(dustbinId);
    if (!dustbin) return res.status(404).json({ success: false, message: "Dustbin not found" });

    const imageUrl = req.file.path;

    // Resolve Complaint if linked
    if (complaintId && complaintId !== "undefined") {
      await Complaint.findByIdAndUpdate(complaintId, {
        status: "resolved", resolvedAt: new Date(), active: false, ComimageUrl: imageUrl
      });

      await Complaint.updateMany(
        { dustbinId: dustbinId, status: "assigned" },
        { $set: { status: "resolved", resolvedAt: new Date(), active: false, ComimageUrl: imageUrl } }
      );
    }

    const finalStatus = status === "suspecies" ? "suspecies" : "clean";

    const updatedBin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      { status: finalStatus, imageUrl: imageUrl, lastCleanedAt: new Date() },
      { new: true }
    );

    // 🔥 SOCKET EMIT 1: Update Map Marker Color (Green)
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "UPDATE", 
      data: updatedBin 
    });

    // 🔥 SOCKET EMIT 2: Update Dashboard Stats (Clean Count +1)
    io.emit("stats_update", { type: "CLEANED", dustbinId: dustbinId });

    res.json({ success: true, message: `Dustbin marked as ${finalStatus}`, data: updatedBin });

  } catch (err) {
    console.error("Mark Clean Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ================= MANUAL UPDATE STATUS (Admin) ================= */
router.put("/update-status/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const { status } = req.body;

  try {
    const dustbin = await Dustbin.findById(dustbinId);
    if (!dustbin) return res.status(404).json({ success: false, message: "Dustbin not found" });

    dustbin.status = status || "clean";
    if (status === "clean") dustbin.lastCleanedAt = new Date();

    await dustbin.save();

    // 🔥 SOCKET EMIT: Instant Status Update on Dashboard
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "UPDATE", 
      data: dustbin 
    });

    return res.json({ success: true, message: "Dustbin status updated manually", data: dustbin });
  } catch (err) {
    console.error("Manual Status Update Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DRIVER SKIP/UPDATE ================= */
router.put("/driver-update-status/:dustbinId", staffAuth, async (req, res) => {
  try {
    const { dustbinId } = req.params;
    const { status } = req.body; // e.g., "skiped"

    const updatedBin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      { status: status, imageUrl: null, lastCleanedAt: new Date() },
      { new: true }
    );

    if (!updatedBin) return res.status(404).json({ success: false, message: "Dustbin not found" });

    // 🔥 SOCKET EMIT: Turn Marker Red/Yellow instantly
    const io = req.app.get("io");
    io.emit("dustbin_data_update", { 
      type: "UPDATE", 
      data: updatedBin 
    });

    res.json({ success: true, data: updatedBin });
  } catch (err) {
    console.error("Driver Update Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;