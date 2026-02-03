const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const adminAuth = require("../middleware/adminAuth");
const { route } = require("./office");
const Citizen = require('../model/CitizenModel');
const Dustbin = require('../model/DustbinModel');
const Complaint = require('../model/ComplaintModel');
const Vehicle = require('../model/VehicleModel');
const Route = require('../model/RouteModel');
const citizenAuth = require("../middleware/citizenAuth");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      address,
      officeId,   // Frontend dropdown se aayega
      cityName,   // Frontend dropdown selection se aayega
      pincode,
      latitude,
      longitude
    } = req.body;

    // 1. Validation check (Optional but recommended)
    if (!officeId || !cityName) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid City/Office."
      });
    }

    // 2. Citizen ka data object create karein
    const citizenData = new Citizen({
      fullName,
      email,
      phone,
      username: phone, // Phone number hi username banega
      address,
      officeId,        // Link to the Office model
      cityName,        // Selected city name
      pincode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON: [lng, lat]
      },
    });

    // 3. passport-local-mongoose use karke register karein
    const registeredCitizen = await Citizen.register(citizenData, password);

    // 4. Register hone ke baad seedha login karwana
    req.login(registeredCitizen, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ success: false, message: "Registered but login failed." });
      }

      res.status(201).json({
        success: true,
        message: "Registration successful!",
        user: {
          id: registeredCitizen._id,
          fullName: registeredCitizen.fullName,
          username: registeredCitizen.username,
          cityName: registeredCitizen.cityName
        }
      });
    });

    console.log(`New Citizen Registered: ${registeredCitizen.username} for City: ${registeredCitizen.cityName}`);

  } catch (error) {
    // Duplicate Key Error Handling (Email, Phone, ya Username pehle se exist karta ho)
    if (error.code === 11000 || error.name === "UserExistsError") {
      return res.status(400).json({
        success: false,
        message: "User with this Email or Phone number already exists!"
      });
    }

    console.error("Registration route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration.",
      error: error.message
    });
  }
});

//get dustbin data
router.get("/dustbin/list/:officeId", citizenAuth, async (req, res) => {

  const { officeId } = req.params;

  try {
    const dustbins = await Dustbin.find({ officeId })
      .select("name area latitude longitude location status routeId binCode lastCleanedAt active")
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

// Configure Multer (Temporary storage before uploading to Cloud)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Configure Cloudinary (Add credentials in your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Complaint Creation Route
router.post("/complaint/create", citizenAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required." });
    }

    // Check if user is actually logged in
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please login." });
    }

    const {
      officeId,
      dustbinId,
      complaintType,
      description,
      latitude,
      longitude,
      area,
      priority
    } = req.body;

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "safaimitra_complaints",
    });

    const newComplaint = new Complaint({
      citizenId: req.user.id,

      officeId: new mongoose.Types.ObjectId(officeId),
      dustbinId: dustbinId ? new mongoose.Types.ObjectId(dustbinId) : null,
      complaintType,
      description,
      area,
      priority: priority || "medium",
      status: "pending",

      latitude: Number(latitude),
      longitude: Number(longitude),
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },

      ComimageUrl: result.secure_url,
    });

    await newComplaint.save();

    res.status(201).json({
      success: true,
      message: "Complaint registered successfully!",
      complaint: newComplaint,
    });

  } catch (error) {
    console.error("Complaint Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
});

// Get the Complaint history
router.get("/complaint/history/:citizenId", citizenAuth, async (req, res) => {
  try {
    const { citizenId } = req.params;

    // 1. Database se complaints dhoondho
    const complaints = await Complaint.find({ citizenId: citizenId })
      .populate("dustbinId", "name area location") // Dustbin ka naam aur area dikhane ke liye
      .sort({ createdAt: -1 }); // Latest complaint sabse upar

    // 2. Agar koi complaint nahi mili
    if (!complaints || complaints.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No complaints found.",
        complaints: []
      });
    }

    // 3. Success Response bhejo
    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });

  } catch (error) {
    console.error("Fetch History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error fetching complaints.",
      error: error.message
    });
  }
});

router.get("/area-stats", citizenAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 0.05 } = req.query; // radius approx 2km
    console.log(`Received area-stats request for lat=${lat}, lng=${lng}, radius=${radius}`);

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "Location required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Area boundary define karein
    const areaQuery = {
      latitude: { $gte: latitude - radius, $lte: latitude + radius },
      longitude: { $gte: longitude - radius, $lte: longitude + radius }
    };

    // 1. Cleaned Today: Aaj kitne bins clean hue is area mein
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cleanedToday = await Dustbin.countDocuments({
      ...areaQuery,
      status: "clean",
      lastCleanedAt: { $gte: todayStart }
    });

    // 2. Active Vehicles: Is area mein kitni online gadiyaan hain
    const activeVehicles = await Vehicle.countDocuments({
      ...areaQuery,
      isOnline: true
    });

    // 3. Pending/Overflow: Is area mein kitne bins gande hain
    const pendingBins = await Dustbin.countDocuments({
      ...areaQuery,
      status: { $in: ["overflow", "missed", "pending", "ideal"] }
    });

    console.log(`Area Stats for (${latitude}, ${longitude}): Cleaned Today=${cleanedToday}, Active Vehicles=${activeVehicles}, Pending Bins=${pendingBins}`);

    res.json({
      success: true,
      stats: {
        cleanedToday,
        activeVehicles,
        pendingBins
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// GET: Active Vehicles Nearby with Route Progress
router.get("/active-vehicles-nearby", citizenAuth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "Location coordinates required" });
    }

    const citizenLat = parseFloat(lat);
    const citizenLng = parseFloat(lng);
    const searchRadius = 0.05;

    // 1. Find Online Vehicles within range
    const activeVehicles = await Vehicle.find({
      isOnline: true,
      latitude: { $gte: citizenLat - searchRadius, $lte: citizenLat + searchRadius },
      longitude: { $gte: citizenLng - searchRadius, $lte: citizenLng + searchRadius }
    }).lean();

    // 2. Calculate Route & Progress for each vehicle
    const vehicleData = await Promise.all(
      activeVehicles.map(async (vehicle) => {
        // Find the route assigned to this vehicle
        const route = await Route.findOne({ assignedVehicleId: vehicle._id }).lean();

        let progressData = {
          route: "Patrolling (No Fixed Route)",
          currentStop: "Area Patrol",
          stopsCompleted: 0,
          totalStops: 0,
          eta: "N/A"
        };

        if (route) {
          // Fetch all bins in this route
          const bins = await Dustbin.find({ routeId: route._id }).lean();

          const totalStops = bins.length;
          // Count bins that are already 'clean'
          const stopsCompleted = bins.filter(b => b.status === "clean").length;

          // Logic: The first bin that is NOT clean is the "Current Stop"
          // If all are clean, route is done.
          const nextPendingBin = bins.find(b => b.status !== "clean");
          const currentStop = nextPendingBin ? nextPendingBin.name : "Route Completed";

          progressData = {
            route: route.name,
            currentStop: currentStop,
            stopsCompleted: stopsCompleted,
            totalStops: totalStops
          };
        }

        // 3. Calculate Mock ETA based on distance
        // Avg speed in city ~ 30km/h = 0.5 km/min
        const distKm = getDistanceFromLatLonInKm(citizenLat, citizenLng, vehicle.latitude, vehicle.longitude);
        const timeMins = Math.ceil(distKm / 0.5) + 2; // +2 mins buffer

        return {
          id: vehicle._id,
          number: vehicle.vehicleNumber,
          // Frontend expects 'route', 'currentStop', 'stopsCompleted', 'totalStops', 'eta'
          route: progressData.route,
          currentStop: progressData.currentStop,
          stopsCompleted: progressData.stopsCompleted,
          totalStops: progressData.totalStops,
          eta: `${timeMins} mins away`,

          // Map coordinates for marker (used in parent component)
          coordinates: [vehicle.latitude, vehicle.longitude]
        };
      })
    );

    res.json({
      success: true,
      vehicles: vehicleData
    });

  } catch (error) {
    console.error("Fetch Active Vehicles Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;