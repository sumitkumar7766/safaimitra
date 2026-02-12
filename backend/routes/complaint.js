const express = require("express");
const router = express.Router();
const Dustbin = require("../model/DustbinModel");
const Route = require("../model/RouteModel");
const Office = require("../model/OfficeModel");
const Complaint = require("../model/ComplaintModel");
const Vehicle = require("../model/VehicleModel");
const Staff = require("../model/StaffModel");
const officeAuth = require("../middleware/officeAuth");
const upload = require("../utils/cloudinaryConfig");
const staffAuth = require("../middleware/staffAuth");
const mongoose = require("mongoose");

// GET: Fetch ALL complaints (No Socket change needed here, just fetching)
router.get("/all/:officeId", officeAuth, async (req, res) => {
  try {
    const { officeId } = req.params;

    const complaints = await Complaint.aggregate([
      {
        $match: {
          officeId: new mongoose.Types.ObjectId(officeId),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$dustbinId",
          activeReports: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["pending", "assigned", "overflow", "in_progress"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          allComplaintIds: { $push: "$_id" }, // Keeps history

          // Only push ID if status is NOT resolved/closed
          activeComplaintIds: {
            $push: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["pending", "overflow", "assigned", "in_progress"],
                  ],
                },
                "$_id",
                "$$REMOVE",
              ],
            },
          },
          // 🔥 NEW: Total resolved count bhi nikal lo taaki history me dikha sako
          resolvedReports: {
            $sum: {
              $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
            },
          },
          hasActiveAssignment: {
            $max: {
              $cond: [
                { $in: ["$status", ["assigned", "in_progress"]] },
                true,
                false,
              ],
            },
          },
          latestDescription: { $first: "$description" },
          latestPriority: { $max: "$priority" },
          complaintIds: { $push: "$_id" },
          area: { $first: "$area" },
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          ComimageUrl: { $first: "$ComimageUrl" },
          rawStatus: { $first: "$status" },
          vehicle: { $first: "$vehicle" },
          createdAt: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "dustbins",
          localField: "_id",
          foreignField: "_id",
          as: "dustbinDetails",
        },
      },
      {
        $unwind: { path: "$dustbinDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "routes",
          localField: "dustbinDetails.routeId",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "dustbinDetails.routeName": "$routeInfo.name",
          dustbinId: "$_id",

          // 🔥 STATUS LOGIC:
          // Agar activeReports 0 hai -> "resolved"
          // Agar activeReports > 0 -> "assigned" / "pending"
          status: {
            $cond: {
              if: { $eq: ["$activeReports", 0] },
              then: "resolved",
              else: {
                $cond: {
                  if: { $eq: ["$hasActiveAssignment", true] },
                  then: "assigned",
                  else: "$rawStatus",
                },
              },
            },
          },
        },
      },
      { $project: { routeInfo: 0, rawStatus: 0, hasActiveAssignment: 0 } },

      // ❌ YAHAN SE { $match: { activeReports: { $gt: 0 } } } HATA DIYA GAYA HAI
      // Ab ye Resolved complaints bhi return karega.

      { $sort: { activeReports: -1, createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Assign Vehicle (🔥 SOCKET IO LOGIC ADDED HERE 🔥)
// POST: Assign Vehicle
router.post("/assign-vehicle", async (req, res) => {
  try {
    const { complaintIds, vehicleId, dustbinId } = req.body;

    const io = req.app.get("io");

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const driver = await Staff.findOne({
      assignedVehicleId: vehicleId,
      role: "driver",
    });

    // 1. Update Dustbin Status
    const dustbin = await Dustbin.findByIdAndUpdate(
      dustbinId,
      { status: "overflow" },
      { new: true },
    );

    // 🔥 LOGIC FIX START: Only update complaints that are NOT resolved or closed 🔥
    await Complaint.updateMany(
      {
        _id: { $in: complaintIds },
        status: { $nin: ["resolved", "closed"] }, // This prevents reopening old complaints
      },
      {
        $set: {
          vehicle: vehicle.vehicleNumber,
          assignedVehicleId: vehicleId,
          status: "assigned",
          driverId: driver ? driver._id : null,
        },
      },
    );
    // 🔥 LOGIC FIX END 🔥

    // 2. Fetch the updated valid complaints to send accurate socket data
    // (We fetch only the ones that are now 'assigned' from the list we just sent)
    const validAssignedComplaints = await Complaint.find({
      _id: { $in: complaintIds },
      status: "assigned",
    });

    // Get the first one for location details
    const firstComplaint = validAssignedComplaints[0];

    if (!firstComplaint) {
      return res.status(400).json({
        success: false,
        message: "No active complaints found to assign.",
      });
    }

    // 🔥 SOCKET EMIT 1: Update Office Dashboard
    io.emit("complaint_status_update", {
      type: "ASSIGNED",
      complaintIds: validAssignedComplaints.map((c) => c._id), // Only send IDs that actually changed
      vehicleNumber: vehicle.vehicleNumber,
      status: "assigned",
    });

    io.emit("dustbin_data_update", {
      type: "UPDATE",
      data: dustbin,
    });

    // 🔥 SOCKET EMIT 2: Notify Driver
    if (driver) {
      const newStopData = {
        id: dustbinId, // Grouping by Dustbin ID is safer for driver
        name: `🚨 Cleanup Task`,
        coordinates: [firstComplaint.latitude, firstComplaint.longitude],
        status: "overflow",
        type: "complaint",
        isNew: true,
        complaintId: firstComplaint._id,
        isGrouped: true,
      };

      io.to(`driver_${driver._id}`).emit("new_job_alert", {
        title: "🚨 Emergency Task!",
        message: `Total ${validAssignedComplaints.length} reports at ${firstComplaint.area}`,
        newStop: newStopData,
        imageUrl: firstComplaint.ComimageUrl,
      });
    }

    res.json({
      success: true,
      message: `Vehicle assigned to ${validAssignedComplaints.length} active reports. Resolved reports were ignored.`,
      vehicleNumber: vehicle.vehicleNumber,
    });
  } catch (error) {
    console.error("Assign Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
