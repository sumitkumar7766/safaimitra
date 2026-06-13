const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const adminAuth = require("../middleware/adminAuth");
const { route } = require("./office");
const Citizen = require("../model/CitizenModel");
const Dustbin = require("../model/DustbinModel");
const Complaint = require("../model/ComplaintModel");
const Vehicle = require("../model/VehicleModel");
const Route = require("../model/RouteModel");
const citizenAuth = require("../middleware/citizenAuth");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// 1. REGISTER CITIZEN (Socket Update Added)
router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      address,
      officeId,
      cityName,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (!officeId || !cityName) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid City/Office.",
      });
    }

    const citizenData = new Citizen({
      fullName,
      email,
      phone,
      username: phone,
      address,
      officeId,
      cityName,
      pincode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    const registeredCitizen = await Citizen.register(citizenData, password);

    // 🔥 SOCKET.IO UPDATE START 🔥
    // Notify Admin Dashboard that a new user count is available
    const io = req.app.get("io");
    io.emit("stats_update", {
      type: "NEW_CITIZEN",
      city: cityName,
    });
    // 🔥 SOCKET.IO UPDATE END 🔥

    req.login(registeredCitizen, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res
          .status(500)
          .json({ success: false, message: "Registered but login failed." });
      }

      res.status(201).json({
        success: true,
        message: "Registration successful!",
        user: {
          id: registeredCitizen._id,
          fullName: registeredCitizen.fullName,
          username: registeredCitizen.username,
          cityName: registeredCitizen.cityName,
        },
      });
    });

    console.log(`New Citizen Registered: ${registeredCitizen.username}`);
  } catch (error) {
    if (error.code === 11000 || error.name === "UserExistsError") {
      return res.status(400).json({
        success: false,
        message: "User with this Email or Phone number already exists!",
      });
    }

    console.error("Registration route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration.",
      error: error.message,
    });
  }
});

// GET DUSTBIN DATA (No Socket needed for fetch)
router.get("/dustbin/list/:officeId", citizenAuth, async (req, res) => {
  const { officeId } = req.params;

  try {
    const dustbins = await Dustbin.find({ officeId })
      .select(
        "name area latitude longitude location status routeId binCode lastCleanedAt active",
      )
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

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. CREATE COMPLAINT (Major Socket Update)
router.post(
  "/complaint/create",
  citizenAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Image is required." });
      }

      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized. Please login." });
      }

      const {
        officeId,
        dustbinId,
        complaintType,
        description,
        latitude,
        longitude,
        area,
        priority,
      } = req.body;

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "safaimitra_complaints",
      });

      // 🔥 AUTO-ASSIGNMENT LOGIC START 🔥
      // Check agar is Dustbin par pehle se koi Gadi (Vehicle) assigned hai
      let autoAssignData = {
        status: "pending",
        vehicle: null,
        assignedVehicleId: null,
        driverId: null,
      };

      if (dustbinId) {
        // Find latest active complaint for this dustbin
        const existingActiveComplaint = await Complaint.findOne({
          dustbinId: new mongoose.Types.ObjectId(dustbinId),
          status: { $in: ["assigned", "in_progress"] }, // Sirf active wale check karo
        }).sort({ createdAt: -1 });

        // Agar pehle se assigned hai, to data copy kar lo
        if (existingActiveComplaint) {
          console.log(
            "⚡ Auto-Assigning New Complaint to Vehicle:",
            existingActiveComplaint.vehicle,
          );
          autoAssignData = {
            status: "assigned", // Direct assigned status
            vehicle: existingActiveComplaint.vehicle,
            assignedVehicleId: existingActiveComplaint.assignedVehicleId,
            driverId: existingActiveComplaint.driverId,
          };
        }
      }
      // 🔥 AUTO-ASSIGNMENT LOGIC END 🔥

      const Staff = require("../model/StaffModel");
      const supervisor = await Staff.findOne({ officeId: new mongoose.Types.ObjectId(officeId), role: "supervisor" });
      const zoneOfficer = await Staff.findOne({ officeId: new mongoose.Types.ObjectId(officeId), role: "zone_officer" });
      const municipalOfficer = await Staff.findOne({ officeId: new mongoose.Types.ObjectId(officeId), role: "municipal_officer" });
      const commissioner = await Staff.findOne({ officeId: new mongoose.Types.ObjectId(officeId), role: "commissioner" });

      const newComplaint = new Complaint({
        citizenId: req.user.id,
        officeId: new mongoose.Types.ObjectId(officeId),
        dustbinId: dustbinId ? new mongoose.Types.ObjectId(dustbinId) : null,
        complaintType,
        description,
        area,
        priority: priority || "medium",

        // 👇 Updated Fields based on logic
        status: autoAssignData.status,
        vehicle: autoAssignData.vehicle,
        assignedVehicleId: autoAssignData.assignedVehicleId,
        driverId: autoAssignData.driverId,

        latitude: Number(latitude),
        longitude: Number(longitude),
        location: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
        ComimageUrl: result.secure_url,

        // JAES fields
        currentEscalationLevel: 1,
        escalatedAt: new Date(),
        nextEscalationAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        publicEscalationEligible: false,
        slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        pendingDays: 0,
        supervisorId: supervisor ? supervisor._id : null,
        zoneOfficerId: zoneOfficer ? zoneOfficer._id : null,
        municipalOfficerId: municipalOfficer ? municipalOfficer._id : null,
        commissionerId: commissioner ? commissioner._id : null,
        escalationHistory: [
          {
            escalationTime: new Date(),
            prevLevel: 0,
            newLevel: 1,
            prevAuthority: "None",
            newAuthority: "Driver",
            statusChange: "Complaint Submitted",
            resolutionTime: null
          }
        ]
      });

      await newComplaint.save();

      // Populate details
      const populatedComplaint = await newComplaint.populate(
        "dustbinId",
        "name",
      );

      // 🔥 SOCKET.IO UPDATE START 🔥
      const io = req.app.get("io");

      // 1. Alert Admin (New Complaint aayi hai - Chahe pending ho ya assigned)
      io.emit("new_complaint", populatedComplaint);

      // 2. Update Live Stats
      io.emit("stats_update", {
        type: "NEW_COMPLAINT_ADDED",
        officeId: officeId,
      });

      // 3. 🚨 AGAR AUTO-ASSIGN HUA HAI, TO DRIVER KO ALERT BHEJO 🚨
      if (autoAssignData.driverId) {
        const driverRoom = `driver_${autoAssignData.driverId}`;

        io.to(driverRoom).emit("new_job_alert", {
          title: "🚨 Update: More Garbage!",
          message: "A new report received for your current/assigned location.",
          newStop: {
            id: dustbinId || newComplaint._id,
            name: `🚨 Update: ${area}`,
            coordinates: [Number(latitude), Number(longitude)],
            status: "overflow",
            type: "complaint",
            isNew: true,
            complaintId: newComplaint._id,
          },
          imageUrl: result.secure_url,
        });
        console.log(
          `📡 Driver ${autoAssignData.driverId} notified about added complaint.`,
        );
      }
      // 🔥 SOCKET.IO UPDATE END 🔥

      res.status(201).json({
        success: true,
        message:
          autoAssignData.status === "assigned"
            ? "Complaint registered & added to existing pickup route!"
            : "Complaint registered successfully!",
        complaint: newComplaint,
      });
    } catch (error) {
      console.error("Complaint Creation Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
);

// GET COMPLAINT HISTORY (Fetch only)
router.get("/complaint/history/:citizenId", citizenAuth, async (req, res) => {
  try {
    const { citizenId } = req.params;
    const complaints = await Complaint.find({ citizenId: citizenId })
      .populate("dustbinId", "name area location")
      .sort({ createdAt: -1 });

    if (!complaints || complaints.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No complaints found.",
        complaints: [],
      });
    }

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Fetch History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error fetching complaints.",
      error: error.message,
    });
  }
});

// GET AREA STATS (Fetch only - Realtime calcs happen on request)
router.get("/area-stats", citizenAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 0.05 } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ success: false, message: "Location required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const areaQuery = {
      latitude: { $gte: latitude - radius, $lte: latitude + radius },
      longitude: { $gte: longitude - radius, $lte: longitude + radius },
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cleanedToday = await Dustbin.countDocuments({
      ...areaQuery,
      status: "clean",
      lastCleanedAt: { $gte: todayStart },
    });

    const activeVehicles = await Vehicle.countDocuments({
      ...areaQuery,
      isOnline: true,
    });

    const pendingBins = await Dustbin.countDocuments({
      ...areaQuery,
      status: { $in: ["overflow", "missed", "pending", "ideal"] },
    });

    res.json({
      success: true,
      stats: {
        cleanedToday,
        activeVehicles,
        pendingBins,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UTILITY FUNCTIONS
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// GET ACTIVE VEHICLES (Fetch only)
router.get("/active-vehicles-nearby", citizenAuth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ success: false, message: "Location coordinates required" });
    }

    const citizenLat = parseFloat(lat);
    const citizenLng = parseFloat(lng);
    const searchRadius = 0.05;

    const activeVehicles = await Vehicle.find({
      isOnline: true,
      latitude: {
        $gte: citizenLat - searchRadius,
        $lte: citizenLat + searchRadius,
      },
      longitude: {
        $gte: citizenLng - searchRadius,
        $lte: citizenLng + searchRadius,
      },
    }).lean();

    const vehicleData = await Promise.all(
      activeVehicles.map(async (vehicle) => {
        const route = await Route.findOne({
          assignedVehicleId: vehicle._id,
        }).lean();

        let progressData = {
          route: "Patrolling (No Fixed Route)",
          currentStop: "Area Patrol",
          stopsCompleted: 0,
          totalStops: 0,
          eta: "N/A",
        };

        if (route) {
          const bins = await Dustbin.find({ routeId: route._id }).lean();
          const totalStops = bins.length;
          const stopsCompleted = bins.filter(
            (b) => b.status === "clean",
          ).length;
          const nextPendingBin = bins.find((b) => b.status !== "clean");
          const currentStop = nextPendingBin
            ? nextPendingBin.name
            : "Route Completed";

          progressData = {
            route: route.name,
            currentStop: currentStop,
            stopsCompleted: stopsCompleted,
            totalStops: totalStops,
          };
        }

        const distKm = getDistanceFromLatLonInKm(
          citizenLat,
          citizenLng,
          vehicle.latitude,
          vehicle.longitude,
        );
        const timeMins = Math.ceil(distKm / 0.5) + 2;

        return {
          id: vehicle._id,
          number: vehicle.vehicleNumber,
          route: progressData.route,
          currentStop: progressData.currentStop,
          stopsCompleted: progressData.stopsCompleted,
          totalStops: progressData.totalStops,
          eta: `${timeMins} mins away`,
          coordinates: [vehicle.latitude, vehicle.longitude],
        };
      }),
    );

    res.json({
      success: true,
      vehicles: vehicleData,
    });
  } catch (error) {
    console.error("Fetch Active Vehicles Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
