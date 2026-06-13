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
          currentEscalationLevel: { $max: "$currentEscalationLevel" },
          nextEscalationAt: { $min: "$nextEscalationAt" },
          publicEscalationEligible: { $max: "$publicEscalationEligible" },
          pendingDays: { $max: "$pendingDays" },
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

    const hasLegalReview = await Complaint.exists({
      _id: { $in: complaintIds },
      legalReviewRequired: true
    });
    if (hasLegalReview) {
      return res.status(400).json({
        success: false,
        message: "Action blocked: One or more complaints are locked for Legal Review."
      });
    }

    const firstComplaint = await Complaint.findById(complaintIds[0]);
    if (!firstComplaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

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

    // Fetch Hierarchy
    const supervisor = await Staff.findOne({ officeId: firstComplaint.officeId, role: "supervisor" });
    const zoneOfficer = await Staff.findOne({ officeId: firstComplaint.officeId, role: "zone_officer" });
    const municipalOfficer = await Staff.findOne({ officeId: firstComplaint.officeId, role: "municipal_officer" });
    const commissioner = await Staff.findOne({ officeId: firstComplaint.officeId, role: "commissioner" });

    // 🔥 LOGIC FIX START: Only update complaints that are NOT resolved or closed 🔥
    const complaintsToUpdate = await Complaint.find({
      _id: { $in: complaintIds },
      status: { $nin: ["resolved", "closed"] },
    });

    for (const comp of complaintsToUpdate) {
      comp.vehicle = vehicle.vehicleNumber;
      comp.assignedVehicleId = vehicleId;
      comp.status = "assigned";
      comp.driverId = driver ? driver._id : null;
      comp.nextEscalationAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Reset countdown to 24h
      if (supervisor) comp.supervisorId = supervisor._id;
      if (zoneOfficer) comp.zoneOfficerId = zoneOfficer._id;
      if (municipalOfficer) comp.municipalOfficerId = municipalOfficer._id;
      if (commissioner) comp.commissionerId = commissioner._id;

      comp.escalationHistory.push({
        escalationTime: new Date(),
        prevLevel: comp.currentEscalationLevel || 1,
        newLevel: comp.currentEscalationLevel || 1,
        prevAuthority: "Unassigned",
        newAuthority: driver ? `Driver: ${driver.name}` : `Vehicle: ${vehicle.vehicleNumber}`,
        statusChange: "Assigned to Driver / Worker",
        resolutionTime: null
      });

      await comp.save();
    }
    // 🔥 LOGIC FIX END 🔥

    // 2. Fetch the updated valid complaints to send accurate socket data
    // (We fetch only the ones that are now 'assigned' from the list we just sent)
    const validAssignedComplaints = await Complaint.find({
      _id: { $in: complaintIds },
      status: "assigned",
    });

    // Get the first one for location details
    const assignedFirstComplaint = validAssignedComplaints[0];

    if (!assignedFirstComplaint) {
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
        coordinates: [assignedFirstComplaint.latitude, assignedFirstComplaint.longitude],
        status: "overflow",
        type: "complaint",
        isNew: true,
        complaintId: assignedFirstComplaint._id,
        isGrouped: true,
      };

      io.to(`driver_${driver._id}`).emit("new_job_alert", {
        title: "🚨 Emergency Task!",
        message: `Total ${validAssignedComplaints.length} reports at ${assignedFirstComplaint.area}`,
        newStop: newStopData,
        imageUrl: assignedFirstComplaint.ComimageUrl,
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

// GET: Fetch individual complaint details
router.get("/detail/:complaintId", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId)
      .populate("citizenId", "fullName phone")
      .populate("driverId", "name phone")
      .populate("supervisorId", "name phone")
      .populate("zoneOfficerId", "name phone")
      .populate("municipalOfficerId", "name phone")
      .populate("commissionerId", "name phone");
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    return res.status(200).json({ success: true, complaint });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Fetch ALL individual complaints for Escalation Dashboard (ungrouped)
router.get("/escalations/:officeId", officeAuth, async (req, res) => {
  try {
    const { officeId } = req.params;

    const complaints = await Complaint.find({
      officeId: new mongoose.Types.ObjectId(officeId),
    })
      .populate("citizenId", "fullName phone")
      .populate("driverId", "name phone")
      .populate("supervisorId", "name phone")
      .populate("zoneOfficerId", "name phone")
      .populate("municipalOfficerId", "name phone")
      .populate("commissionerId", "name phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Error fetching escalation complaints:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Generate Social Media Share Card (HTML layout with client-side PNG canvas generator)
router.get("/share-card/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId)
      .populate("citizenId", "fullName phone")
      .populate("driverId", "name phone")
      .populate("supervisorId", "name phone")
      .populate("zoneOfficerId", "name phone")
      .populate("municipalOfficerId", "name phone")
      .populate("commissionerId", "name phone");

    if (!complaint) {
      return res.status(404).send("Complaint not found");
    }

    const createdDate = new Date(complaint.createdAt || complaint.reportedAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const authorityNames = {
      1: "Driver / Worker",
      2: "Area Supervisor",
      3: "Zone Officer",
      4: "Municipal Officer",
      5: "City Commissioner"
    };

    const currentAuthName = authorityNames[complaint.currentEscalationLevel || 1];
    const trackingId = complaint._id.toString().slice(-6).toUpperCase();

    // Prepare escalation timeline nodes for script drawing
    const driverName = complaint.driverId ? complaint.driverId.name : (complaint.vehicle !== "Not Assigned" ? complaint.vehicle : "Assigned Driver");
    const supervisorName = complaint.supervisorId ? complaint.supervisorId.name : "Area Supervisor";
    const zoneOfficerName = complaint.zoneOfficerId ? complaint.zoneOfficerId.name : "Zone Officer";
    const municipalOfficerName = complaint.municipalOfficerId ? complaint.municipalOfficerId.name : "Municipal Officer";
    const commissionerName = complaint.commissionerId ? complaint.commissionerId.name : "City Commissioner";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafaiMitra Escalation Card #${trackingId}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f3f4f6;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      margin: 0;
    }
    .card {
      width: 600px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .photo-container {
      width: 100%;
      height: 180px;
      border-radius: 16px;
      overflow: hidden;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }
    .photo-container img {
      width: 100%;
      height: 100%;
      object-cover: cover;
    }
    .info-list {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .info-item {
      font-size: 14px;
      color: #374151;
    }
    .info-label {
      font-weight: bold;
      color: #4b5563;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .info-value {
      font-weight: 600;
      color: #111827;
    }
    .timeline {
      margin-top: 24px;
      border-top: 1px dashed #e5e7eb;
      padding-top: 24px;
    }
    .timeline-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
    }
    .timeline-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .timeline-item.active .timeline-dot {
      background-color: #ef4444;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
    }
    .timeline-item.pending .timeline-dot {
      background-color: #d1d5db;
    }
    .timeline-label {
      font-weight: 600;
      color: #1f2937;
    }
    .timeline-item.pending .timeline-label {
      color: #9ca3af;
    }
    .timeline-staff {
      font-size: 12px;
      color: #6b7280;
      margin-left: auto;
    }
    .footer {
      background: #f9fafb;
      padding: 16px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
    }
    .actions {
      margin-top: 20px;
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    #cardCanvas {
      display: none;
    }
  </style>
</head>
<body>

  <div class="card" id="cardElement">
    <div class="header">
      <h1>🍃 SafaiMitra Grievance</h1>
      <p>Jan Accountability Escalation System (JAES)</p>
    </div>
    
    <div class="content">
      <div class="meta-grid">
        <div class="info-list">
          <div class="info-item">
            <div class="info-label">Complaint ID</div>
            <div class="info-value">#SM${trackingId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Location Area</div>
            <div class="info-value">${complaint.area || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Created Date</div>
            <div class="info-value">${createdDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Pending Since</div>
            <div class="info-value">${complaint.pendingDays || 0} Days</div>
          </div>
          <div class="info-item">
            <div class="info-label">Current Authority</div>
            <div class="info-value">${currentAuthName}</div>
          </div>
        </div>
        
        <div class="photo-container">
          <img id="complaintImage" src="${complaint.ComimageUrl}" crossorigin="anonymous" alt="Complaint Photo" />
        </div>
      </div>

      <div class="info-item" style="margin-bottom: 24px;">
        <div class="info-label">Description</div>
        <div class="info-value" style="font-weight: normal; color: #4b5563;">${complaint.description || "N/A"}</div>
      </div>
      
      <div class="timeline">
        <div class="timeline-title">Escalation Path & History</div>
        
        <div class="timeline-item ${complaint.currentEscalationLevel >= 1 ? 'active' : 'pending'}">
          <span class="timeline-dot"></span>
          <span class="timeline-label">Level 1: Driver / Worker</span>
          <span class="timeline-staff">${driverName}</span>
        </div>
        <div class="timeline-item ${complaint.currentEscalationLevel >= 2 ? 'active' : 'pending'}">
          <span class="timeline-dot"></span>
          <span class="timeline-label">Level 2: Area Supervisor</span>
          <span class="timeline-staff">${supervisorName}</span>
        </div>
        <div class="timeline-item ${complaint.currentEscalationLevel >= 3 ? 'active' : 'pending'}">
          <span class="timeline-dot"></span>
          <span class="timeline-label">Level 3: Zone Officer</span>
          <span class="timeline-staff">${zoneOfficerName}</span>
        </div>
        <div class="timeline-item ${complaint.currentEscalationLevel >= 4 ? 'active' : 'pending'}">
          <span class="timeline-dot"></span>
          <span class="timeline-label">Level 4: Municipal Officer</span>
          <span class="timeline-staff">${municipalOfficerName}</span>
        </div>
        <div class="timeline-item ${complaint.currentEscalationLevel >= 5 ? 'active' : 'pending'}">
          <span class="timeline-dot"></span>
          <span class="timeline-label">Level 5: City Commissioner</span>
          <span class="timeline-staff">${commissionerName}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      SafaiMitra Governance and Accountability Portal
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick="downloadCard()">Download PNG Card</button>
  </div>

  <canvas id="cardCanvas" width="800" height="1200"></canvas>

  <script>
    function downloadCard() {
      const canvas = document.getElementById("cardCanvas");
      const ctx = canvas.getContext("2d");

      // Set clean white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 1200);

      // 1. Header Banner
      const grd = ctx.createLinearGradient(0, 0, 800, 0);
      grd.addColorStop(0, "#1e3a8a");
      grd.addColorStop(1, "#2563eb");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 800, 180);

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("🍃 SafaiMitra Grievance", 50, 80);
      ctx.font = "16px sans-serif";
      ctx.fillText("Jan Accountability Escalation System (JAES)", 50, 125);

      // 2. Metadata Labels & Values
      ctx.fillStyle = "#111827";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("Complaint #SM${trackingId}", 50, 260);

      let y = 330;
      const metadata = [
        { label: "Location Area", value: "${complaint.area || 'N/A'}" },
        { label: "Created Date", value: "${createdDate}" },
        { label: "Pending Since", value: "${complaint.pendingDays || 0} Days" },
        { label: "Current Authority", value: "${currentAuthName}" }
      ];

      metadata.forEach(item => {
        ctx.fillStyle = "#4b5563";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(item.label.toUpperCase(), 50, y);
        ctx.fillStyle = "#111827";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(item.value, 50, y + 26);
        y += 75;
      });

      // 3. Draw Complaint Photo
      const img = document.getElementById("complaintImage");
      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.strokeRect(430, 230, 320, 240);
        ctx.drawImage(img, 430, 230, 320, 240);
      } else {
        // Draw image placeholder box
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(430, 230, 320, 240);
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 2;
        ctx.strokeRect(430, 230, 320, 240);
        ctx.fillStyle = "#9ca3af";
        ctx.font = "16px sans-serif";
        ctx.fillText("No Image Available", 510, 360);
      }

      // 4. Description Box
      ctx.fillStyle = "#4b5563";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("DESCRIPTION", 50, y + 20);
      ctx.fillStyle = "#111827";
      ctx.font = "16px sans-serif";
      
      const descText = "${complaint.description ? complaint.description.replace(/\\r?\\n/g, ' ') : 'N/A'}";
      // Simple text wrapper
      const words = descText.split(' ');
      let line = '';
      let descY = y + 45;
      const maxWidth = 700;
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 50, descY);
          line = words[n] + ' ';
          descY += 24;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 50, descY);

      // 5. Divider Line
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 700);
      ctx.lineTo(750, 700);
      ctx.stroke();

      // 6. Timeline Section
      ctx.fillStyle = "#111827";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("Escalation Path & History", 50, 750);

      const timelineNodes = [
        { label: "Level 1: Driver / Worker", staff: "${driverName}", active: ${complaint.currentEscalationLevel >= 1} },
        { label: "Level 2: Area Supervisor", staff: "${supervisorName}", active: ${complaint.currentEscalationLevel >= 2} },
        { label: "Level 3: Zone Officer", staff: "${zoneOfficerName}", active: ${complaint.currentEscalationLevel >= 3} },
        { label: "Level 4: Municipal Officer", staff: "${municipalOfficerName}", active: ${complaint.currentEscalationLevel >= 4} },
        { label: "Level 5: City Commissioner", staff: "${commissionerName}", active: ${complaint.currentEscalationLevel >= 5} }
      ];

      let nodeY = 810;
      timelineNodes.forEach(node => {
        // Draw dot
        ctx.fillStyle = node.active ? "#ef4444" : "#d1d5db";
        ctx.beginPath();
        ctx.arc(60, nodeY - 6, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Draw connector line (if active)
        if (nodeY < 1100) {
          ctx.strokeStyle = node.active ? "#ef4444" : "#d1d5db";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(60, nodeY + 2);
          ctx.lineTo(60, nodeY + 68);
          ctx.stroke();
        }

        // Print labels
        ctx.fillStyle = node.active ? "#1f2937" : "#9ca3af";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(node.label, 90, nodeY);
        
        ctx.fillStyle = "#6b7280";
        ctx.font = "14px sans-serif";
        ctx.fillText(node.staff, 500, nodeY);

        nodeY += 70;
      });

      // 7. Footer
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 1130, 800, 70);
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("SafaiMitra Governance and Accountability Portal", 240, 1172);

      // Trigger download
      const link = document.createElement('a');
      link.download = 'complaint_card_SM${trackingId}.png';
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  </script>
</body>
</html>
    `;

    res.set("Content-Type", "text/html");
    res.send(html);

  } catch (error) {
    console.error("Error displaying share card:", error);
    res.status(500).send("Internal Server Error displaying sharing card");
  }
});

module.exports = router;
