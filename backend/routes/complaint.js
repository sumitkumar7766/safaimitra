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

// sumit
// GET: Fetch ALL complaints for a specific Office 
// GET: Fetch ALL complaints (With Separated Counts)
router.get("/all/:officeId", officeAuth, async (req, res) => {
  try {
    const { officeId } = req.params;

    const complaints = await Complaint.aggregate([
      // Stage 1: Sirf is office ki complaints (Resolved filter nahi hai)
      {
        $match: {
          officeId: new mongoose.Types.ObjectId(officeId)
        }
      },
      
      // Stage 2: Sort (Latest Pehle)
      { $sort: { createdAt: -1 } },

      // Stage 3: Grouping & Conditional Counting
      {
        $group: {
          _id: "$dustbinId", 
          
          // 🔥 NEW: Total Count (History + Current)
          totalReports: { $sum: 1 }, 

          // 🔥 NEW: Sirf Active Count (Pending/Assigned/Overflow)
          activeReports: { 
            $sum: { 
              $cond: [ 
                { $in: ["$status", ["pending", "assigned", "overflow", "in_progress"]] }, 
                1, // Agar status active hai to 1 jodo
                0  // Agar resolved hai to 0 jodo
              ] 
            } 
          },

          // Latest details
          latestDescription: { $first: "$description" },
          latestPriority: { $max: "$priority" }, 
          complaintIds: { $push: "$_id" },

          area: { $first: "$area" },
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          ComimageUrl: { $first: "$ComimageUrl" },
          status: { $first: "$status" }, // Latest status
          vehicle: { $first: "$vehicle" },
          createdAt: { $first: "$createdAt" }
        }
      },
      
      // Stage 4: Dustbin Details
      {
        $lookup: {
          from: "dustbins",
          localField: "_id",
          foreignField: "_id",
          as: "dustbinDetails"
        }
      },
      { $unwind: { path: "$dustbinDetails", preserveNullAndEmptyArrays: true } },

      // Stage 5: Route Name
      {
        $lookup: {
          from: "routes",
          localField: "dustbinDetails.routeId",
          foreignField: "_id",
          as: "routeInfo"
        }
      },
      { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: true } },

      // Stage 6: Cleanup
      {
        $addFields: {
          "dustbinDetails.routeName": "$routeInfo.name"
        }
      },
      { $project: { routeInfo: 0 } },

      // Stage 7: Sort by Active Reports (Jispe kaam baki hai wo upar dikhe)
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

router.post("/assign-vehicle", async (req, res) => {
  try {
    // Frontend ab ek ID nahi, balki IDs ka Array bhejega
    const { complaintIds, vehicleId } = req.body;

    const io = req.app.get("io");
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const driver = await Staff.findOne({ assignedVehicleId: vehicleId, role: "driver" });

    // 🔥 JADOO: Ek saath saari complaints ko update karo
    await Complaint.updateMany(
      { _id: { $in: complaintIds } }, // Jinki IDs is array me hain
      {
        $set: {
          vehicle: vehicle.vehicleNumber,
          assignedVehicleId: vehicleId,
          status: "assigned",
          driverId: driver ? driver._id : null
        }
      }
    );

    // Driver Notification Logic (Pehli complaint ka data use karo notification ke liye)
    const firstComplaint = await Complaint.findById(complaintIds[0]).populate("dustbinId");

    if (driver && io) {
      const newStopData = {
        id: firstComplaint.dustbinId ? firstComplaint.dustbinId._id : firstComplaint._id,
        name: firstComplaint.dustbinId ? `🚨 ${firstComplaint.dustbinId.name}` : "🚨 Urgent Cleanup",
        coordinates: [firstComplaint.latitude, firstComplaint.longitude],
        status: "overflow",
        type: "complaint",
        isNew: true,
        // Driver ko sirf ek ID bhejo (resolve karne ke liye), backend sambhal lega
        complaintId: firstComplaint._id,
        isGrouped: true // Optional flag
      };

      io.to(`driver_${driver._id}`).emit("new_job_alert", {
        title: "🚨 Emergency Task!",
        message: `Total ${complaintIds.length} reports at ${firstComplaint.area}`,
        newStop: newStopData,
        imageUrl: firstComplaint.ComimageUrl
      });
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