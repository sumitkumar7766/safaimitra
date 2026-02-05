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
          officeId: new mongoose.Types.ObjectId(officeId)
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$dustbinId", 
          totalReports: { $sum: 1 }, 
          activeReports: { 
            $sum: { 
              $cond: [ 
                { $in: ["$status", ["pending", "assigned", "overflow", "in_progress"]] }, 
                1, 
                0 
              ] 
            } 
          },
          latestDescription: { $first: "$description" },
          latestPriority: { $max: "$priority" }, 
          complaintIds: { $push: "$_id" },
          area: { $first: "$area" },
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          ComimageUrl: { $first: "$ComimageUrl" },
          status: { $first: "$status" },
          vehicle: { $first: "$vehicle" },
          createdAt: { $first: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: "dustbins",
          localField: "_id",
          foreignField: "_id",
          as: "dustbinDetails"
        }
      },
      { $unwind: { path: "$dustbinDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "routes",
          localField: "dustbinDetails.routeId",
          foreignField: "_id",
          as: "routeInfo"
        }
      },
      { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "dustbinDetails.routeName": "$routeInfo.name"
        }
      },
      { $project: { routeInfo: 0 } },
      { $sort: { activeReports: -1, createdAt: -1 } }
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
router.post("/assign-vehicle", async (req, res) => {
  try {
    const { complaintIds, vehicleId } = req.body;

    // 1. Get Socket Instance
    const io = req.app.get("io");
    
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const driver = await Staff.findOne({ assignedVehicleId: vehicleId, role: "driver" });

    // 2. Database Update
    await Complaint.updateMany(
      { _id: { $in: complaintIds } }, 
      {
        $set: {
          vehicle: vehicle.vehicleNumber,
          assignedVehicleId: vehicleId,
          status: "assigned",
          driverId: driver ? driver._id : null
        }
      }
    );

    // 3. Get Details for Notifications
    const firstComplaint = await Complaint.findById(complaintIds[0]).populate("dustbinId");

    // 🔥 SOCKET EMIT 1: Update Office Dashboard (Real-time List Refresh)
    // This tells the frontend "Hey, complaints updated, refresh your list"
    io.emit("complaint_status_update", {
        type: "ASSIGNED",
        complaintIds: complaintIds,
        vehicleNumber: vehicle.vehicleNumber,
        status: "assigned"
    });

    // 🔥 SOCKET EMIT 2: Notify Driver (Specific Room)
    if (driver) {
      const newStopData = {
        id: firstComplaint.dustbinId ? firstComplaint.dustbinId._id : firstComplaint._id,
        name: firstComplaint.dustbinId ? `🚨 ${firstComplaint.dustbinId.name}` : "🚨 Urgent Cleanup",
        coordinates: [firstComplaint.latitude, firstComplaint.longitude],
        status: "overflow",
        type: "complaint",
        isNew: true,
        complaintId: firstComplaint._id,
        isGrouped: true
      };

      // Send alert specifically to this driver's room
      io.to(`driver_${driver._id}`).emit("new_job_alert", {
        title: "🚨 Emergency Task!",
        message: `Total ${complaintIds.length} reports at ${firstComplaint.area}`,
        newStop: newStopData,
        imageUrl: firstComplaint.ComimageUrl
      });
      
      console.log(`Socket sent to driver_${driver._id}`);
    }

    res.json({
      success: true,
      message: `Vehicle assigned to ${complaintIds.length} reports successfully`,
      vehicleNumber: vehicle.vehicleNumber
    });

  } catch (error) {
    console.error("Assign Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;