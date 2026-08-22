/**
 * eventDustbin.js
 * End-to-End Event Dustbin Requirement & AI Municipal Allocation Routes
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const os = require("os");
const jwt = require("jsonwebtoken");

const EventDustbinRequest = require("../model/EventDustbinRequestModel");
const Citizen = require("../model/CitizenModel");
const Dustbin = require("../model/DustbinModel");
const Vehicle = require("../model/VehicleModel");
const Staff = require("../model/StaffModel");
const eventAnalysisService = require("../services/EventAnalysisService");
const mlPredictionService = require("../services/MLPredictionService");

// Configure Multer
const uploadDir = process.env.VERCEL ? os.tmpdir() : "./uploads/";
if (!process.env.VERCEL && !fs.existsSync("./uploads/")) {
  fs.mkdirSync("./uploads/", { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🛡️ Middleware: Citizen Authentication
const citizenAuth = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === "citizen") {
    return next();
  }
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "Citizen" || decoded.role === "citizen") {
        req.user = decoded;
        return next();
      }
    }
  } catch (err) {
    console.error("Citizen Auth Error:", err.message);
  }
  return res.status(401).json({ success: false, message: "Unauthorized. Citizen access only." });
};

// 🛡️ Middleware: Office / Admin Authentication
const officeAuth = (req, res, next) => {
  const allowedRoles = ["office", "admin", "supervisor", "zone_officer", "municipal_officer", "commissioner"];
  if (req.isAuthenticated() && req.user && (allowedRoles.includes(req.user.role) || req.user.designation)) {
    return next();
  }
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      // Try SECRET_KEY first, fallback to JWT_SECRET
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
      } catch (e) {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      }
      if (allowedRoles.includes(decoded.role) || decoded.designation || decoded.role === "admin") {
        req.user = decoded;
        return next();
      }
    }
  } catch (err) {
    console.error("Office Auth Error:", err.message);
  }
  return res.status(401).json({ success: false, message: "Unauthorized. Office/Admin access only." });
};

// ==============================================================================
// 1. CITIZEN: CREATE EVENT DUSTBIN REQUEST
// ==============================================================================
router.post(
  "/event-dustbin-requests",
  citizenAuth,
  upload.fields([
    { name: "eventProof", maxCount: 1 },
    { name: "identityProof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const citizenId = req.user.id || req.user._id;
      const citizen = await Citizen.findById(citizenId);
      if (!citizen) {
        return res.status(404).json({ success: false, message: "Citizen record not found." });
      }

      if (citizen.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Your account is currently suspended. You cannot submit event requests.",
        });
      }

      // Check required event proof document
      if (!req.files || !req.files.eventProof || req.files.eventProof.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Event Proof / Invitation document is required.",
        });
      }

      const {
        eventType,
        eventName,
        expectedGuests,
        eventDate,
        startTime,
        endTime,
        durationHours,
        venueType,
        foodService,
        foodType,
        foodPlates,
        wasteTypes,
        notes,
        address,
        latitude,
        longitude,
        officeId,
        cityName,
      } = req.body;

      // Validate required fields
      if (!eventType || !eventName || !expectedGuests || !eventDate || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Please fill all required event details.",
        });
      }

      if (Number(expectedGuests) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Expected guests must be greater than 0.",
        });
      }

      if (!latitude || !longitude || !address) {
        return res.status(400).json({
          success: false,
          message: "Valid event venue address and coordinates are required.",
        });
      }

      // 1. Upload Event Proof to Cloudinary
      const eventProofFile = req.files.eventProof[0];
      const eventProofUpload = await cloudinary.uploader.upload(eventProofFile.path, {
        folder: "safaimitra_event_proofs",
      });

      // 2. Upload Identity Proof if provided
      let identityProofUpload = null;
      let identityProofFile = null;
      if (req.files.identityProof && req.files.identityProof.length > 0) {
        identityProofFile = req.files.identityProof[0];
        identityProofUpload = await cloudinary.uploader.upload(identityProofFile.path, {
          folder: "safaimitra_identity_proofs",
        });
      }

      // 3. Prepare Event Object
      const parsedWasteTypes = Array.isArray(wasteTypes)
        ? wasteTypes
        : typeof wasteTypes === "string"
        ? wasteTypes.split(",").map((s) => s.trim())
        : ["Wet", "Dry"];

      const eventData = {
        type: eventType,
        name: eventName,
        expectedGuests: Number(expectedGuests),
        date: eventDate,
        startTime,
        endTime,
        durationHours: Number(durationHours) || 4,
        venueType: venueType || "Community Hall",
        foodService: foodService === "true" || foodService === true,
        foodType: foodType || "None",
        foodPlates: Number(foodPlates) || 0,
        wasteTypes: parsedWasteTypes,
        notes: notes || "",
        location: {
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
      };

      // 4. Run AI Event Analysis & Deterministic Waste Engine
      const aiAnalysis = await eventAnalysisService.analyzeEvent(eventData, eventProofFile);

      // 5. Generate unique Human-readable Request ID
      const count = await EventDustbinRequest.countDocuments();
      const currentYear = new Date().getFullYear();
      const requestId = `SM-EVT-${currentYear}-${String(count + 1).padStart(6, "0")}`;

      // 6. Create Database Record
      const newRequest = new EventDustbinRequest({
        requestId,
        citizenId,
        citizenName: citizen.fullName || citizen.name || "Citizen",
        citizenPhone: citizen.phone || citizen.username || "",
        citizenEmail: citizen.email || "",
        officeId: officeId || citizen.officeId,
        cityName: cityName || citizen.cityName || "Municipal Corporation",
        event: eventData,
        location: {
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
        documents: {
          eventProof: {
            url: eventProofUpload.secure_url,
            type: eventProofFile.mimetype,
            originalFilename: eventProofFile.originalname,
            uploadedAt: new Date(),
            verificationStatus: aiAnalysis.documentValid ? "VERIFIED" : "FLAGGED",
          },
          identityProof: {
            url: identityProofUpload ? identityProofUpload.secure_url : "",
            type: identityProofFile ? identityProofFile.mimetype : "",
            originalFilename: identityProofFile ? identityProofFile.originalname : "",
            uploadedAt: new Date(),
            verificationStatus: identityProofUpload ? "VERIFIED" : "NOT_PROVIDED",
          },
        },
        aiAnalysis,
        adminDecision: {
          status: "PENDING",
          approvedBins: { ...aiAnalysis.recommendedBins },
          approvedCollectionFrequency: aiAnalysis.collectionFrequency,
        },
        status: "PENDING_ADMIN_REVIEW",
        auditLog: [
          {
            user: citizen.fullName || "Citizen",
            action: "REQUEST_SUBMITTED",
            timestamp: new Date(),
            newValue: `Created ${requestId} with ${aiAnalysis.recommendedBins.total} AI recommended bins`,
            reason: "Initial submission",
          },
        ],
      });

      await newRequest.save();

      // Clean up local tmp files
      if (fs.existsSync(eventProofFile.path)) fs.unlinkSync(eventProofFile.path);
      if (identityProofFile && fs.existsSync(identityProofFile.path)) {
        fs.unlinkSync(identityProofFile.path);
      }

      // 🔥 Emit Socket.IO alert for City Admins
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("new_event_request", {
            requestId: newRequest.requestId,
            id: newRequest._id,
            eventName: newRequest.event.name,
            eventType: newRequest.event.type,
            cityName: newRequest.cityName,
            wasteRisk: newRequest.aiAnalysis.wasteRisk,
            recommendedTotal: newRequest.aiAnalysis.recommendedBins.total,
          });
        }
      } catch (sockErr) {
        console.warn("Socket broadcast error:", sockErr.message);
      }

      return res.status(201).json({
        success: true,
        message: "Event dustbin request submitted successfully and queued for City Admin review.",
        request: newRequest,
      });
    } catch (error) {
      console.error("Create Event Dustbin Request Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to submit event dustbin request.",
      });
    }
  }
);

// ==============================================================================
// 2. CITIZEN: GET MY REQUESTS
// ==============================================================================
router.get("/event-dustbin-requests/my", citizenAuth, async (req, res) => {
  try {
    const citizenId = req.user.id || req.user._id;
    const requests = await EventDustbinRequest.find({ citizenId })
      .sort({ createdAt: -1 })
      .populate("allocation.vehicleId", "vehicleNumber model")
      .populate("allocation.staffId", "name phone");

    return res.json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Get My Event Requests Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 3. CITIZEN: GET SINGLE REQUEST DETAILS
// ==============================================================================
router.get("/event-dustbin-requests/:id", citizenAuth, async (req, res) => {
  try {
    const citizenId = req.user.id || req.user._id;
    const request = await EventDustbinRequest.findOne({
      _id: req.params.id,
      citizenId,
    })
      .populate("allocation.vehicleId", "vehicleNumber model")
      .populate("allocation.staffId", "name phone")
      .populate("allocation.allocatedDustbinIds", "name area location binCode");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    return res.json({ success: true, request });
  } catch (error) {
    console.error("Get Event Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 4. CITIZEN: CANCEL REQUEST
// ==============================================================================
router.patch("/event-dustbin-requests/:id/cancel", citizenAuth, async (req, res) => {
  try {
    const citizenId = req.user.id || req.user._id;
    const request = await EventDustbinRequest.findOne({ _id: req.params.id, citizenId });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    if (request.status === "COMPLETED" || request.status === "ALLOCATED") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a request that has already been allocated or completed.",
      });
    }

    const previousStatus = request.status;
    request.status = "CANCELLED";
    request.auditLog.push({
      user: req.user.name || "Citizen",
      action: "REQUEST_CANCELLED",
      timestamp: new Date(),
      previousValue: previousStatus,
      newValue: "CANCELLED",
      reason: req.body.reason || "Citizen cancelled the request.",
    });

    await request.save();

    return res.json({
      success: true,
      message: "Event dustbin request cancelled.",
      request,
    });
  } catch (error) {
    console.error("Cancel Event Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 4B. RUN REAL-TIME ML PREDICTION ON AN EVENT REQUEST
// ==============================================================================
router.post("/event-dustbin-requests/:id/predict", async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Event request not found." });
    }

    // 1. Run Real ML Prediction
    const prediction = await mlPredictionService.predict(request.event);

    // 2. Update Request's aiAnalysis object in MongoDB
    request.aiAnalysis.estimatedWasteKg = prediction.estimatedWasteKg;
    request.aiAnalysis.recommendedBins = prediction.recommendedBins;
    request.aiAnalysis.collectionFrequency = prediction.collectionFrequency;
    request.aiAnalysis.wasteRisk = prediction.wasteRisk;
    request.aiAnalysis.dataCoverage = prediction.dataCoverage;
    request.aiAnalysis.modelVersion = prediction.modelVersion;
    request.aiAnalysis.algorithm = prediction.algorithm;
    request.aiAnalysis.trainingSampleCount = prediction.trainingSampleCount;
    request.aiAnalysis.validationMae = prediction.validationMae;
    request.aiAnalysis.reasoning = prediction.reasoning;
    request.aiAnalysis.analyzedAt = new Date();

    // 3. Update Audit Log
    request.auditLog.push({
      user: req.user?.name || "SafaiMitra ML Engine",
      action: "ML_PREDICTION_EVALUATED",
      timestamp: new Date(),
      previousValue: `Estimated: ${request.aiAnalysis.estimatedWasteKg} kg`,
      newValue: `Predicted: ${prediction.estimatedWasteKg} kg (${prediction.modelVersion})`,
      reason: "Real-time ML waste regression pipeline re-evaluation.",
    });

    await request.save();

    return res.json({
      success: true,
      eventId: request._id,
      requestId: request.requestId,
      estimatedWasteKg: prediction.estimatedWasteKg,
      recommendedBins: prediction.recommendedBins,
      collectionFrequency: prediction.collectionFrequency,
      riskLevel: prediction.wasteRisk,
      dataCoverage: prediction.dataCoverage,
      modelVersion: prediction.modelVersion,
      algorithm: prediction.algorithm,
      trainingSampleCount: prediction.trainingSampleCount,
      validationMae: prediction.validationMae,
      reasoning: prediction.reasoning,
    });
  } catch (error) {
    console.error("Predict Event Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 5. ADMIN: GET ALL REQUESTS WITH FILTERS & COUNTERS
// ==============================================================================
router.get("/admin/event-dustbin-requests", officeAuth, async (req, res) => {
  try {
    const { status, eventType, wasteRisk, date, search } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (eventType && eventType !== "ALL") {
      filter["event.type"] = eventType;
    }
    if (wasteRisk && wasteRisk !== "ALL") {
      filter["aiAnalysis.wasteRisk"] = wasteRisk;
    }
    if (date) {
      filter["event.date"] = date;
    }
    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: "i" } },
        { "event.name": { $regex: search, $options: "i" } },
        { citizenName: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
    }

    const requests = await EventDustbinRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("allocation.vehicleId", "vehicleNumber model")
      .populate("allocation.staffId", "name phone");

    // Metrics Counters
    const allCityRequests = await EventDustbinRequest.find({});
    const pendingCount = allCityRequests.filter((r) => r.status === "PENDING_ADMIN_REVIEW").length;
    const approvedCount = allCityRequests.filter((r) => r.status === "APPROVED" || r.status === "MODIFIED").length;
    const allocatedCount = allCityRequests.filter((r) => r.status === "ALLOCATED").length;
    const rejectedCount = allCityRequests.filter((r) => r.status === "REJECTED").length;
    const highRiskCount = allCityRequests.filter(
      (r) => r.aiAnalysis?.wasteRisk === "HIGH" || r.aiAnalysis?.wasteRisk === "CRITICAL"
    ).length;

    return res.json({
      success: true,
      requests,
      metrics: {
        total: allCityRequests.length,
        pending: pendingCount,
        approved: approvedCount,
        allocated: allocatedCount,
        rejected: rejectedCount,
        highRisk: highRiskCount,
      },
    });
  } catch (error) {
    console.error("Admin Get Event Requests Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 6. ADMIN: GET SINGLE REQUEST WITH FULL AI METRICS
// ==============================================================================
router.get("/admin/event-dustbin-requests/:id", officeAuth, async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id)
      .populate("allocation.vehicleId", "vehicleNumber model driverId")
      .populate("allocation.staffId", "name phone designation")
      .populate("allocation.allocatedDustbinIds", "name area latitude longitude location binCode");

    if (!request) {
      return res.status(404).json({ success: false, message: "Event request not found." });
    }

    return res.json({ success: true, request });
  } catch (error) {
    console.error("Admin Get Single Event Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 7. ADMIN: APPROVE REQUEST
// ==============================================================================
router.post("/admin/event-dustbin-requests/:id/approve", officeAuth, async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const { comment = "" } = req.body;
    const previousStatus = request.status;

    request.status = "APPROVED";
    request.adminDecision = {
      status: "APPROVED",
      approvedBins: { ...request.aiAnalysis.recommendedBins },
      approvedCollectionFrequency: request.aiAnalysis.collectionFrequency,
      adminComment: comment || "Approved as per AI waste requirement engine recommendations.",
      adminId: req.user.id || req.user._id,
      adminName: req.user.name || "City Administrator",
      decidedAt: new Date(),
    };

    request.auditLog.push({
      user: req.user.name || "Admin",
      action: "REQUEST_APPROVED",
      timestamp: new Date(),
      previousValue: previousStatus,
      newValue: "APPROVED",
      reason: comment || "Approved AI recommendation",
    });

    await request.save();

    // Broadcast update
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("event_request_updated", {
          id: request._id,
          requestId: request.requestId,
          status: "APPROVED",
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `Request ${request.requestId} approved successfully with ${request.adminDecision.approvedBins.total} dustbins.`,
      request,
    });
  } catch (error) {
    console.error("Approve Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 8. ADMIN: MODIFY REQUEST (Adjust Bin Quantities & Schedule)
// ==============================================================================
router.post("/admin/event-dustbin-requests/:id/modify", officeAuth, async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const { wetBins, dryBins, generalBins, collectionFrequency, reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admin justification reason is mandatory when modifying bin recommendations.",
      });
    }

    const wet = Math.max(0, Number(wetBins) || 0);
    const dry = Math.max(0, Number(dryBins) || 0);
    const general = Math.max(0, Number(generalBins) || 0);
    const total = wet + dry + general;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total dustbins must be at least 1.",
      });
    }

    const previousStatus = request.status;
    const previousBins = JSON.stringify(request.adminDecision?.approvedBins || {});

    request.status = "MODIFIED";
    request.adminDecision = {
      status: "MODIFIED",
      approvedBins: { wet, dry, general, total },
      approvedCollectionFrequency: Number(collectionFrequency) || 1,
      adminComment: reason,
      adminId: req.user.id || req.user._id,
      adminName: req.user.name || "City Administrator",
      decidedAt: new Date(),
    };

    request.auditLog.push({
      user: req.user.name || "Admin",
      action: "REQUEST_MODIFIED",
      timestamp: new Date(),
      previousValue: `Status: ${previousStatus}, Bins: ${previousBins}`,
      newValue: `Status: MODIFIED, Bins: ${JSON.stringify({ wet, dry, general, total })}`,
      reason,
    });

    await request.save();

    // Broadcast update
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("event_request_updated", {
          id: request._id,
          requestId: request.requestId,
          status: "MODIFIED",
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `Request ${request.requestId} modified with customized ${total} dustbins.`,
      request,
    });
  } catch (error) {
    console.error("Modify Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 9. ADMIN: REJECT REQUEST
// ==============================================================================
router.post("/admin/event-dustbin-requests/:id/reject", officeAuth, async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "A clear rejection reason is required.",
      });
    }

    const previousStatus = request.status;
    request.status = "REJECTED";
    request.adminDecision = {
      status: "REJECTED",
      approvedBins: { wet: 0, dry: 0, general: 0, total: 0 },
      approvedCollectionFrequency: 0,
      adminComment: reason,
      adminId: req.user.id || req.user._id,
      adminName: req.user.name || "City Administrator",
      decidedAt: new Date(),
    };

    request.auditLog.push({
      user: req.user.name || "Admin",
      action: "REQUEST_REJECTED",
      timestamp: new Date(),
      previousValue: previousStatus,
      newValue: "REJECTED",
      reason,
    });

    await request.save();

    // Broadcast update
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("event_request_updated", {
          id: request._id,
          requestId: request.requestId,
          status: "REJECTED",
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `Request ${request.requestId} has been rejected.`,
      request,
    });
  } catch (error) {
    console.error("Reject Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 10. ADMIN: ALLOCATE DUSTBINS, VEHICLE & STAFF
// ==============================================================================
router.post("/admin/event-dustbin-requests/:id/allocate", officeAuth, async (req, res) => {
  try {
    const request = await EventDustbinRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const { vehicleId, staffId, allocatedDustbinIds = [], collectionSchedule } = req.body;

    let vehicleNumber = "";
    let staffName = "";

    if (vehicleId) {
      const v = await Vehicle.findById(vehicleId);
      if (v) vehicleNumber = v.vehicleNumber;
    }
    if (staffId) {
      const s = await Staff.findById(staffId);
      if (s) staffName = s.name;
    }

    const previousStatus = request.status;
    request.status = "ALLOCATED";
    request.allocation = {
      vehicleId: vehicleId || null,
      vehicleNumber,
      staffId: staffId || null,
      staffName,
      allocatedDustbinIds,
      collectionSchedule: collectionSchedule || "As per approved frequency",
      allocatedAt: new Date(),
    };

    request.auditLog.push({
      user: req.user.name || "Admin",
      action: "RESOURCES_ALLOCATED",
      timestamp: new Date(),
      previousValue: previousStatus,
      newValue: "ALLOCATED",
      reason: `Assigned Vehicle: ${vehicleNumber || "N/A"}, Staff: ${staffName || "N/A"}, Dustbins: ${allocatedDustbinIds.length}`,
    });

    await request.save();

    // Broadcast update
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("event_request_updated", {
          id: request._id,
          requestId: request.requestId,
          status: "ALLOCATED",
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `Resources allocated for ${request.requestId}. Staff and vehicle deployed.`,
      request,
    });
  } catch (error) {
    console.error("Allocate Resources Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 11. STAFF: POST-EVENT ACTUAL OUTCOME FEEDBACK LOOP
// ==============================================================================
router.post(
  "/staff/event-dustbin-requests/:id/complete",
  upload.fields([
    { name: "beforeImage", maxCount: 1 },
    { name: "afterImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const request = await EventDustbinRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found." });
      }

      const {
        actualWasteKg,
        actualWetWasteKg,
        actualDryWasteKg,
        numberOfCollections,
        overflowOccurred,
        staffRemarks,
      } = req.body;

      let beforeImageUrl = "";
      let afterImageUrl = "";

      if (req.files?.beforeImage?.[0]) {
        const up = await cloudinary.uploader.upload(req.files.beforeImage[0].path, {
          folder: "safaimitra_event_feedback",
        });
        beforeImageUrl = up.secure_url;
      }

      if (req.files?.afterImage?.[0]) {
        const up = await cloudinary.uploader.upload(req.files.afterImage[0].path, {
          folder: "safaimitra_event_feedback",
        });
        afterImageUrl = up.secure_url;
      }

      request.status = "COMPLETED";
      request.actualResult = {
        actualWasteKg: Number(actualWasteKg) || 0,
        actualWetWasteKg: Number(actualWetWasteKg) || 0,
        actualDryWasteKg: Number(actualDryWasteKg) || 0,
        numberOfCollections: Number(numberOfCollections) || 1,
        overflowOccurred: overflowOccurred === "true" || overflowOccurred === true,
        staffRemarks: staffRemarks || "Post-event collection successfully completed.",
        beforeImage: beforeImageUrl,
        afterImage: afterImageUrl,
        submittedAt: new Date(),
      };

      request.auditLog.push({
        user: "Field Staff",
        action: "EVENT_COMPLETED",
        timestamp: new Date(),
        previousValue: "ALLOCATED",
        newValue: "COMPLETED",
        reason: `Recorded actual waste: ${actualWasteKg} kg (Overflow: ${overflowOccurred ? "Yes" : "No"})`,
      });

      await request.save();

      return res.json({
        success: true,
        message: "Post-event waste outcome submitted. Data stored for ML continuous training.",
        request,
      });
    } catch (error) {
      console.error("Complete Event Outcome Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==============================================================================
// 12. ADMIN: ML & AI PREDICTION PERFORMANCE METRICS
// ==============================================================================
router.get("/admin/event-dustbin-requests/analytics/ml-performance", officeAuth, async (req, res) => {
  try {
    const completedEvents = await EventDustbinRequest.find({
      status: "COMPLETED",
      "actualResult.actualWasteKg": { $ne: null },
    });

    const metrics = mlPredictionService.calculateModelMetrics(completedEvents);

    return res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("ML Performance Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
