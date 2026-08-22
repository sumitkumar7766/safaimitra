const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Citizen = require("../model/CitizenModel");
const Complaint = require("../model/ComplaintModel");
const Appeal = require("../model/AppealModel");
const AuditLog = require("../model/AuditLogModel");

// Middleware to authorize office/admin
const officeAuth = (req, res, next) => {
  const allowedRoles = ["office", "admin", "supervisor", "zone_officer", "municipal_officer", "commissioner"];
  
  // 1. Check Passport session-based auth
  if (req.isAuthenticated() && (allowedRoles.includes(req.user.role) || req.user.designation)) {
    return next();
  }

  // 2. Check JWT Bearer token auth
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      if (allowedRoles.includes(decoded.role) || decoded.designation) {
        req.user = decoded; // Attach user to request
        return next();
      }
    }
  } catch (err) {
    console.error("Office JWT Verification Error in citizenSystem route:", err.message);
  }

  return res.status(401).json({ success: false, message: "Unauthorized. Office/Admin only." });
};

// Middleware to authorize citizen
const citizenAuth = (req, res, next) => {
  // 1. Check Passport session-based auth
  if (req.isAuthenticated() && req.user.role === "citizen") {
    return next();
  }

  // 2. Check JWT Bearer token auth
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "Citizen" || decoded.role === "citizen") {
        req.user = decoded; // Attach user to request
        return next();
      }
    }
  } catch (err) {
    console.error("Citizen JWT Verification Error in citizenSystem route:", err.message);
  }

  return res.status(401).json({ success: false, message: "Unauthorized. Citizen only." });
};

// Helper to calculate Level
function calculateCitizenLevel(points) {
  if (points >= 1000) return "Platinum Citizen";
  if (points >= 500) return "Gold Citizen";
  if (points >= 300) return "Silver Citizen";
  if (points >= 150) return "Bronze Citizen";
  if (points >= 50) return "Active Citizen";
  return "Beginner Citizen";
}

// Helper to calculate Badges
function calculateCitizenBadges(points, validComplaints) {
  const badges = [];
  if (points >= 150 || validComplaints >= 10) badges.push("Bronze Badge");
  if (points >= 300 || validComplaints >= 25) badges.push("Silver Badge");
  if (points >= 500 || validComplaints >= 50) badges.push("Gold Badge");
  if (points >= 1000 || validComplaints >= 100) badges.push("Platinum Badge");
  
  if (validComplaints >= 15) badges.push("Top Citizen Reporter");
  if (validComplaints >= 30) badges.push("Cleanliness Champion");
  if (validComplaints >= 45) badges.push("Area Guardian");
  if (validComplaints >= 60) badges.push("Community Hero");
  
  return badges;
}

// 1. GET CITIZEN PROFILE SCORECARD
router.get("/profile-scorecard/:citizenId", async (req, res) => {
  try {
    const { citizenId } = req.params;
    const user = await Citizen.findById(citizenId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Calculate dynamic ranks
    const allCity = await Citizen.find({ role: "citizen" }).sort({ trustScore: -1, validComplaints: -1 });
    const cityRank = allCity.findIndex(c => c._id.toString() === citizenId.toString()) + 1;

    const allArea = await Citizen.find({ role: "citizen", cityName: user.cityName }).sort({ trustScore: -1, validComplaints: -1 });
    const areaRank = allArea.findIndex(c => c._id.toString() === citizenId.toString()) + 1;

    // Calculate Success Rate
    const totalCount = user.validComplaints + user.falseComplaints;
    const successRate = totalCount > 0 ? Math.round((user.validComplaints / totalCount) * 100) : 100;

    // Make sure badges & level are up-to-date
    user.citizenLevel = calculateCitizenLevel(user.trustScore);
    user.badges = calculateCitizenBadges(user.trustScore, user.validComplaints);
    user.areaRank = areaRank > 0 ? areaRank : 1;
    user.cityRank = cityRank > 0 ? cityRank : 1;
    await user.save();

    return res.status(200).json({
      success: true,
      scorecard: {
        trustScore: user.trustScore,
        validComplaints: user.validComplaints,
        falseComplaints: user.falseComplaints,
        successRate: `${successRate}%`,
        areaRank: `#${user.areaRank}`,
        cityRank: `#${user.cityRank}`,
        citizenLevel: user.citizenLevel,
        badges: user.badges,
        isSuspended: user.isSuspended,
        strikeCount: user.strikeCount,
        suspensionReason: user.suspensionReason
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET SAME-CITY LEADERBOARD
router.get("/leaderboard/:citizenId", async (req, res) => {
  try {
    const { citizenId } = req.params;
    const user = await Citizen.findById(citizenId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const userCity = user.cityName ? user.cityName.trim() : null;

    // Strict Same-City Filter (Excludes other cities and suspended accounts)
    const sameCityQuery = {
      role: "citizen",
      status: { $ne: "suspended" },
    };
    if (userCity) {
      sameCityQuery.cityName = { $regex: new RegExp(`^${userCity}$`, "i") };
    }

    // Same-City Leaderboard (Top 10 citizens from user's city)
    const cityLeaderboard = await Citizen.find(sameCityQuery)
      .select("fullName trustScore validComplaints citizenLevel cityName badges")
      .sort({ trustScore: -1, validComplaints: -1 })
      .limit(10);

    // Calculate user's personal rank in their city
    const higherRankedCount = await Citizen.countDocuments({
      ...sameCityQuery,
      $or: [
        { trustScore: { $gt: user.trustScore || 0 } },
        { trustScore: user.trustScore || 0, validComplaints: { $gt: user.validComplaints || 0 } },
      ],
    });
    const myCityRank = higherRankedCount + 1;

    return res.status(200).json({
      success: true,
      cityName: user.cityName || "City",
      myCityRank,
      cityLeaderboard,
      areaLeaderboard: cityLeaderboard,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. ADMIN/OFFICE: VERIFY COMPLAINT
router.post("/complaint/verify", officeAuth, async (req, res) => {
  try {
    const {
      complaintId,
      verificationStatus, // "genuine", "partially_valid", "duplicate", "false", "misleading", "spam"
      verificationReason,
      verificationNotes,
      verificationEvidenceUrl,
      legalReviewRequired
    } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

    const citizen = await Citizen.findById(complaint.citizenId);
    if (!citizen) return res.status(404).json({ success: false, message: "Citizen not found for this complaint" });

    const adminName = req.user.username || req.user.name || "Admin Officer";

    // Set verification details on complaint
    complaint.verificationStatus = verificationStatus;
    complaint.verificationReason = verificationReason;
    complaint.verificationNotes = verificationNotes || "";
    complaint.verificationEvidenceUrl = verificationEvidenceUrl || "";
    complaint.verificationDate = new Date();
    complaint.verifiedBy = adminName;
    
    if (legalReviewRequired) {
      complaint.legalReviewRequired = true;
    }

    let pointsChange = 0;

    if (["genuine", "partially_valid"].includes(verificationStatus)) {
      // Reward
      pointsChange = 10;
      citizen.trustScore += pointsChange;
      citizen.validComplaints += 1;
      citizen.consecutiveFalseComplaints = 0; // reset consecutive false count
    } else {
      // Penalty (False, Duplicate, Misleading, Spam)
      pointsChange = -20;
      citizen.trustScore += pointsChange;
      citizen.falseComplaints += 1;
      
      if (["false", "misleading", "spam"].includes(verificationStatus)) {
        citizen.consecutiveFalseComplaints += 1;
        citizen.strikeCount += 1;
      }
    }

    // Recalculate level & badges
    citizen.citizenLevel = calculateCitizenLevel(citizen.trustScore);
    citizen.badges = calculateCitizenBadges(citizen.trustScore, citizen.validComplaints);
    await citizen.save();
    await complaint.save();

    // Log action to AuditLog
    await AuditLog.create({
      adminName,
      action: "VERIFICATION_DECISION",
      citizenId: citizen._id,
      complaintId: complaint._id,
      reason: `Verified as ${verificationStatus}. Points change: ${pointsChange}. Reason: ${verificationReason}`,
      evidenceReference: verificationEvidenceUrl || "No Attachment"
    });

    if (legalReviewRequired) {
      await AuditLog.create({
        adminName,
        action: "LEGAL_REVIEW",
        citizenId: citizen._id,
        complaintId: complaint._id,
        reason: `Flagged for legal review: ${verificationReason}`,
        evidenceReference: verificationEvidenceUrl || "No Attachment"
      });
    }

    // Emit Socket Notifications to Citizen
    const io = req.app.get("io");
    if (io && citizen._id) {
      io.to(`citizen_${citizen._id}`).emit("complaint_notification", {
        type: "VERIFICATION",
        message: `Your complaint #${complaint._id.toString().slice(-6).toUpperCase()} was verified as ${verificationStatus.toUpperCase()}. Points: ${pointsChange >= 0 ? '+' : ''}${pointsChange}.`,
        complaintId: complaint._id,
        trustScore: citizen.trustScore,
        citizenLevel: citizen.citizenLevel
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complaint verified successfully",
      complaint,
      citizen: {
        trustScore: citizen.trustScore,
        validComplaints: citizen.validComplaints,
        falseComplaints: citizen.falseComplaints,
        strikeCount: citizen.strikeCount,
        citizenLevel: citizen.citizenLevel
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. ADMIN/OFFICE: SUSPEND CITIZEN
router.post("/citizen/suspend", officeAuth, async (req, res) => {
  try {
    const { citizenId, suspensionReason, evidenceUrl, verificationEvidence } = req.body;
    
    const citizen = await Citizen.findById(citizenId);
    if (!citizen) return res.status(404).json({ success: false, message: "Citizen not found" });

    const adminName = req.user.username || req.user.name || "Admin Officer";

    citizen.isSuspended = true;
    citizen.suspensionReason = suspensionReason;
    await citizen.save();

    await AuditLog.create({
      adminName,
      action: "SUSPENSION",
      citizenId: citizen._id,
      reason: `Suspended account: ${suspensionReason}. Evidence: ${verificationEvidence}`,
      evidenceReference: evidenceUrl || "No Attachment"
    });

    // Notify Citizen
    const io = req.app.get("io");
    if (io && citizen._id) {
      io.to(`citizen_${citizen._id}`).emit("complaint_notification", {
        type: "SUSPENSION",
        message: `Your account has been suspended by Admin. Reason: ${suspensionReason}`,
        isSuspended: true
      });
    }

    return res.status(200).json({ success: true, message: "Citizen suspended successfully", citizen });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. ADMIN/OFFICE: UNSUSPEND CITIZEN
router.post("/citizen/unsuspend", officeAuth, async (req, res) => {
  try {
    const { citizenId, reason } = req.body;
    const citizen = await Citizen.findById(citizenId);
    if (!citizen) return res.status(404).json({ success: false, message: "Citizen not found" });

    const adminName = req.user.username || req.user.name || "Admin Officer";

    citizen.isSuspended = false;
    citizen.suspensionReason = "";
    citizen.strikeCount = 0;
    citizen.consecutiveFalseComplaints = 0;
    await citizen.save();

    await AuditLog.create({
      adminName,
      action: "APPEAL_DECISION",
      citizenId: citizen._id,
      reason: `Account unsuspended. Reason: ${reason}`
    });

    // Notify Citizen
    const io = req.app.get("io");
    if (io && citizen._id) {
      io.to(`citizen_${citizen._id}`).emit("complaint_notification", {
        type: "UNSUSPENDED",
        message: `Your account has been unsuspended. You can now use SafaiMitra.`,
        isSuspended: false
      });
    }

    return res.status(200).json({ success: true, message: "Citizen unsuspended successfully", citizen });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. CITIZEN: SUBMIT APPEAL
router.post("/citizen/appeal", citizenAuth, async (req, res) => {
  try {
    const { reason, evidenceUrl } = req.body;
    
    // Create new appeal
    const appeal = await Appeal.create({
      citizenId: req.user.id,
      reason,
      evidenceUrl: evidenceUrl || ""
    });

    return res.status(200).json({ success: true, message: "Appeal submitted successfully", appeal });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. ADMIN/OFFICE: GET LIST OF APPEALS
router.get("/appeals", officeAuth, async (req, res) => {
  try {
    const appeals = await Appeal.find()
      .populate("citizenId", "fullName email phone citizenLevel trustScore strikeCount")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, appeals });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. ADMIN/OFFICE: RESOLVE APPEAL
router.post("/appeal/resolve", officeAuth, async (req, res) => {
  try {
    const { appealId, action, adminNotes } = req.body; // action: "accept" or "reject"
    
    const appeal = await Appeal.findById(appealId);
    if (!appeal) return res.status(404).json({ success: false, message: "Appeal not found" });

    const citizen = await Citizen.findById(appeal.citizenId);
    if (!citizen) return res.status(404).json({ success: false, message: "Citizen not found for this appeal" });

    const adminName = req.user.username || req.user.name || "Admin Officer";

    appeal.status = action === "accept" ? "accepted" : "rejected";
    appeal.adminNotes = adminNotes;
    appeal.resolvedAt = new Date();
    appeal.resolvedBy = adminName;
    await appeal.save();

    if (action === "accept") {
      citizen.isSuspended = false;
      citizen.suspensionReason = "";
      citizen.strikeCount = 0;
      citizen.consecutiveFalseComplaints = 0;
      await citizen.save();
    }

    await AuditLog.create({
      adminName,
      action: "APPEAL_DECISION",
      citizenId: citizen._id,
      reason: `Appeal ${action.toUpperCase()}. Notes: ${adminNotes}`
    });

    // Notify Citizen
    const io = req.app.get("io");
    if (io && citizen._id) {
      io.to(`citizen_${citizen._id}`).emit("complaint_notification", {
        type: "APPEAL_RESOLVED",
        message: `Your appeal has been ${action === "accept" ? "ACCEPTED" : "REJECTED"}. Notes: ${adminNotes}`,
        isSuspended: citizen.isSuspended
      });
    }

    return res.status(200).json({ success: true, message: `Appeal ${action}ed successfully`, appeal, citizen });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 9. ADMIN/OFFICE: GET AUDIT LOGS
router.get("/audit-logs", officeAuth, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("citizenId", "fullName email")
      .populate("complaintId", "complaintType area status")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 10. ADMIN/OFFICE: GET ALL CITIZENS (for moderation list)
router.get("/citizens", officeAuth, async (req, res) => {
  try {
    const citizens = await Citizen.find({ role: "citizen" }).sort({ trustScore: -1 });
    return res.status(200).json({ success: true, citizens });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
