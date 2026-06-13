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
      data: dustbin,
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

    const io = req.app.get("io");
    io.emit("dustbin_data_update", {
      type: "UPDATE",
      data: dustbins,
    });

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
      return res
        .status(404)
        .json({ success: false, message: "Dustbin not found" });
    }

    if (routeId && String(routeId) !== String(dustbin.routeId)) {
      const newRoute = await Route.findOne({ _id: routeId, officeId });
      if (!newRoute)
        return res
          .status(404)
          .json({ success: false, message: "Route not found" });

      if (dustbin.routeId) {
        await Route.findByIdAndUpdate(dustbin.routeId, {
          $pull: { dustbins: dustbin._id },
        });
      }
      await Route.findByIdAndUpdate(routeId, {
        $addToSet: { dustbins: dustbin._id },
      });
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
      data: dustbin,
    });

    return res.json({
      success: true,
      message: "Dustbin updated successfully",
      dustbin,
    });
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
      return res
        .status(404)
        .json({ success: false, message: "Dustbin not found" });
    }

    if (dustbin.routeId) {
      await Route.findByIdAndUpdate(dustbin.routeId, {
        $pull: { dustbins: dustbin._id },
      });
    }

    await Office.findByIdAndUpdate(officeId, {
      $pull: { dustbins: dustbin._id },
    });
    await Dustbin.findByIdAndDelete(dustbinId);

    // 🔥 SOCKET EMIT: Remove Dustbin from Map
    const io = req.app.get("io");
    io.emit("dustbin_data_update", {
      type: "DELETE",
      id: dustbinId,
    });

    return res.json({ success: true, message: "Dustbin successfully deleted" });
  } catch (err) {
    console.error("Delete Dustbin Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 200 meter logic
// utils/geo.js
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
}

function isWithinRadius(
  driverLat,
  driverLng,
  targetLat,
  targetLng,
  radius = 200,
) {
  const distance = getDistanceInMeters(
    driverLat,
    driverLng,
    targetLat,
    targetLng,
  );

  return {
    allowed: distance <= radius,
    distance: Math.round(distance),
  };
}

module.exports = {
  isWithinRadius,
};

/* ================= DRIVER MARK CLEAN ================= */
router.post(
  "/mark-clean",
  staffAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { dustbinId, status, complaintId, latitude, longitude } = req.body;
      // console.log(latitude, longitude);
      // if (!latitude || !longitude) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Driver location missing",
      //   });
      // }

      // // 🔐 200 Meter Validation
      // const geoCheck = isWithinRadius(
      //   Number(latitude),
      //   Number(longitude),
      //   dustbin.latitude,
      //   dustbin.longitude,
      //   200,
      // );

      // if (!geoCheck.allowed) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "You are too far from the dustbin",
      //     allowedRadius: "200 meters",
      //     currentDistance: `${geoCheck.distance} meters`,
      //   });
      // }

      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No image uploaded" });
      if (!dustbinId)
        return res
          .status(400)
          .json({ success: false, message: "Dustbin ID missing" });

      const dustbin = await Dustbin.findById(dustbinId);
      if (!dustbin)
        return res
          .status(404)
          .json({ success: false, message: "Dustbin not found" });

      const imageUrl = req.file.path;

      const io = req.app.get("io");

      // Resolve Complaint if linked
      if (complaintId && complaintId !== "undefined") {
        const checkComp = await Complaint.findById(complaintId);
        if (checkComp && checkComp.legalReviewRequired) {
          return res.status(400).json({
            success: false,
            message: "Action blocked: This complaint is locked for Legal Review."
          });
        }

        // A. Find ALL linked complaints (Current + Grouped)
        // Hum pehle dhund rahe hain taaki citizens ki ID mil sake
        const linkedComplaints = await Complaint.find({
          $or: [
            { _id: complaintId }, // The main complaint
            {
              dustbinId: dustbinId,
              status: { $in: ["assigned", "in_progress"] },
            }, // Others on same bin
          ],
        });

        // B. Update ALL found complaints to 'resolved' in Database
        if (linkedComplaints.length > 0) {
          const idsToUpdate = linkedComplaints.map((c) => c._id);

          const authorityNames = {
            1: "Driver",
            2: "Area Supervisor",
            3: "Zone Officer",
            4: "Municipal Officer",
            5: "City Commissioner"
          };

          for (const comp of linkedComplaints) {
            comp.status = "resolved";
            comp.resolvedAt = new Date();
            comp.active = false;
            comp.ComimageUrl = imageUrl;
            comp.nextEscalationAt = null;
            comp.publicEscalationEligible = false;

            comp.escalationHistory.push({
              escalationTime: new Date(),
              prevLevel: comp.currentEscalationLevel || 1,
              newLevel: comp.currentEscalationLevel || 1,
              prevAuthority: authorityNames[comp.currentEscalationLevel || 1],
              newAuthority: "None (Resolved)",
              statusChange: "Resolved",
              resolutionTime: new Date()
            });

            await comp.save();
          }

          // C. 🔥 Notify Admin (List Refresh)
          io.emit("complaint_status_update", {
            type: "RESOLVED",
            complaintIds: idsToUpdate,
            dustbinId: dustbinId,
          });

          // D. 🔥 Notify Stats
          io.emit("stats_update", {
            type: "COMPLAINT_RESOLVED",
            count: idsToUpdate.length,
          });

          // E. 🔥 Notify EACH Citizen individually (Loop)
          linkedComplaints.forEach((comp) => {
            if (comp.citizenId) {
              console.log(
                `📡 Sending Alert to Citizen Room: citizen_${comp.citizenId}`,
              );

              io.to(`citizen_${comp.citizenId}`).emit(
                "complaint_resolved_alert",
                {
                  message: `Great news! The issue at ${dustbin.area} has been resolved.`,
                  imageUrl: imageUrl,
                },
              );
            }
          });
        }
      }

      const finalStatus = status === "suspecies" ? "suspecies" : "clean";

      const updatedBin = await Dustbin.findByIdAndUpdate(
        dustbinId,
        { status: finalStatus, imageUrl: imageUrl, lastCleanedAt: new Date() },
        { new: true },
      );

      // 🔥 SOCKET EMIT 1: Update Map Marker Color (Green)
      io.emit("dustbin_data_update", {
        type: "UPDATE",
        data: updatedBin,
      });

      // 🔥 SOCKET EMIT 2: Update Dashboard Stats (Clean Count +1)
      io.emit("stats_update", { type: "CLEANED", dustbinId: dustbinId });

      res.json({
        success: true,
        message: `Dustbin marked as ${finalStatus}`,
        data: updatedBin,
      });
    } catch (err) {
      console.error("Mark Clean Error:", err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },
);

/* ================= MANUAL UPDATE STATUS (Admin) ================= */
router.put("/update-status/:dustbinId", officeAuth, async (req, res) => {
  const { dustbinId } = req.params;
  const { status } = req.body;

  try {
    const dustbin = await Dustbin.findById(dustbinId);
    if (!dustbin)
      return res
        .status(404)
        .json({ success: false, message: "Dustbin not found" });

    dustbin.status = status || "clean";
    if (status === "clean") dustbin.lastCleanedAt = new Date();

    await dustbin.save();

    // 🔥 SOCKET EMIT: Instant Status Update on Dashboard
    const io = req.app.get("io");
    io.emit("dustbin_data_update", {
      type: "UPDATE",
      data: dustbin,
    });

    return res.json({
      success: true,
      message: "Dustbin status updated manually",
      data: dustbin,
    });
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
      { new: true },
    );

    if (!updatedBin)
      return res
        .status(404)
        .json({ success: false, message: "Dustbin not found" });

    // 🔥 SOCKET EMIT: Turn Marker Red/Yellow instantly
    const io = req.app.get("io");
    io.emit("dustbin_data_update", {
      type: "UPDATE",
      data: updatedBin,
    });

    res.json({ success: true, data: updatedBin });
  } catch (err) {
    console.error("Driver Update Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
