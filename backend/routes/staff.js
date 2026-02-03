// routes/staff.js
const express = require("express");
const router = express.Router();
const Staff = require("../model/StaffModel");
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const Route = require("../model/RouteModel");
const Dustbin = require("../model/DustbinModel");
// 👇 1. IMPORT COMPLAINT MODEL
const Complaint = require("../model/ComplaintModel");
const officeAuth = require("../middleware/officeAuth");
const staffAuth = require("../middleware/staffAuth");

/* ================= STAFF REGISTER ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, role, phone, assignedVehicleId } = req.body;
  const officeId = req.user.id;

  if (!name || !role || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name, Role aur Username required hai",
    });
  }

  try {
    if (phone) {
      const exists = await Staff.findOne({ phone });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Is phone number se staff already registered hai",
        });
      }
    }

    const password = phone?.toString().slice(-5);
    const username = phone;

    const staff = new Staff({
      officeId,
      name,
      role,
      phone,
      assignedVehicleId: assignedVehicleId || null,
      active: true,
      username,
    });

    const registeredStaff = await Staff.register(staff, password);

    await Office.findByIdAndUpdate(
      officeId,
      { $push: { staffId: registeredStaff._id } }
    );

    if (assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(
        assignedVehicleId,
        { $set: { driverId: registeredStaff._id } }
      );
    }

    return res.json({
      success: true,
      message: "Staff successfully registered",
      staff: registeredStaff,
      loginInfo: { username, password },
    });
  } catch (err) {
    console.error("Staff Register Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET STAFF LIST ================= */
router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;
  try {
    const staffList = await Staff.find({ officeId })
      .populate("assignedVehicleId", "vehicleNumber type status")
      .sort({ createdAt: -1 });
    return res.json({ success: true, staff: staffList });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE STAFF ================= */
router.delete("/delete/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;

  try {
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    await Office.findByIdAndUpdate(officeId, { $pull: { staff: staff._id } });

    if (staff.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, { $unset: { driverId: "" } });
    }

    await Staff.findByIdAndDelete(staffId);
    return res.json({ success: true, message: "Staff deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= UPDATE STAFF ================= */
router.put("/update/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;
  const { name, role, phone, assignedVehicleId } = req.body;

  try {
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    if (phone && phone !== staff.phone) {
      const exists = await Staff.findOne({ phone });
      if (exists) return res.status(400).json({ success: false, message: "Phone already exists" });
    }

    const oldVehicleId = staff.assignedVehicleId?.toString() || null;
    const newVehicleId = role === "driver" && assignedVehicleId ? assignedVehicleId : null;
    let reassignedFrom = null;

    if (newVehicleId) {
      const otherStaff = await Staff.findOne({
        _id: { $ne: staffId },
        assignedVehicleId: newVehicleId,
        officeId,
      });
      if (otherStaff) return res.status(400).json({ success: false, message: "Vehicle already assigned" });
    }

    staff.name = name;
    staff.role = role;
    staff.phone = phone;
    staff.assignedVehicleId = newVehicleId;
    await staff.save();

    if (oldVehicleId && oldVehicleId !== newVehicleId) {
      await Vehicle.findByIdAndUpdate(oldVehicleId, { $unset: { driverId: "" } });
    }
    if (newVehicleId && oldVehicleId !== newVehicleId) {
      await Vehicle.findByIdAndUpdate(newVehicleId, { driverId: staff._id });
    }

    return res.json({ success: true, message: "Updated", staff });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/remove-vehicle/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;
  try {
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) return res.status(404).json({ success: false, message: "Not found" });

    if (staff.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, { $unset: { driverId: "" } });
    }
    staff.assignedVehicleId = null;
    await staff.save();
    res.json({ success: true, message: "Vehicle removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================ */
/* 👇 2. UPDATED DASHBOARD ROUTE (Fetch Routes + Complaints) 👇 */
/* ============================================================ */
router.get("/dashboard", staffAuth, async (req, res) => {
  const staffId = req.user.id;

  try {
    // 1. Staff nikalo
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    // 2. Assigned Vehicle check
    if (!staff.assignedVehicleId) {
      return res.json({ success: true, message: "No vehicle assigned", staff, vehicle: null, route: null, dustbins: [] });
    }

    const vehicle = await Vehicle.findById(staff.assignedVehicleId);
    if (!vehicle) return res.json({ success: true, staff, vehicle: null, route: null, dustbins: [] });

    // 3. Regular Route ke Dustbins Fetch karo
    let route = null;
    let regularDustbins = [];

    if (vehicle.routeId) {
      route = await Route.findById(vehicle.routeId);
      if (route) {
        regularDustbins = await Dustbin.find({ routeId: route._id, officeId: route.officeId });
      }
    }

    // 4. 🔥 Emergency Complaints Fetch karo 🔥
    // Jo is vehicle ko assign hui hain aur abhi tak complete nahi hui hain
    const assignedComplaints = await Complaint.find({
      assignedVehicleId: vehicle._id,
      status: { $in: ["assigned", "in_progress"] } // Sirf active tasks
    }).populate("dustbinId"); // Dustbin info agar link hai to

    // 5. Complaints ko Standard Dustbin Format me convert karo (Adapter Pattern)
    const formattedComplaints = assignedComplaints.map(complaint => {
      // Agar physical dustbin link hai to uska ID use karo, nahi to complaint ID
      const binId = complaint.dustbinId ? complaint.dustbinId._id : complaint._id;
      const binName = complaint.dustbinId ? `🚨 ${complaint.dustbinId.name}` : `🚨 Alert: ${complaint.area}`;

      return {
        _id: binId,
        name: binName,
        area: complaint.area,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        status: "overflow", // Driver ke liye hamesha Red/Overflow dikhega
        imageUrl: complaint.ComimageUrl || complaint.imageUrl, // Image proof

        // Extra flags for frontend identification
        isEmergency: true,
        complaintId: complaint._id, // Ye ID 'mark-clean' karte waqt kaam aayegi
        lastCleanedAt: null
      };
    });

    // 6. Dono lists ko Jod do (Regular + Emergency)
    const allStops = [...regularDustbins, ...formattedComplaints];

    return res.json({
      success: true,
      staff,
      vehicle,
      route,
      dustbins: allStops, // Mixed Data bhej rahe hain
    });

  } catch (err) {
    console.error("Staff Dashboard Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LOCATION & STATUS UPDATES ================= */
router.post("/update-vehicle-location", staffAuth, async (req, res) => {
  const staffId = req.user.id;
  const { latitude, longitude } = req.body;
  const staff = await Staff.findById(staffId);
  if (!staff || !staff.assignedVehicleId) return res.status(404).json({ success: false });

  await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, {
    latitude, longitude, isOnline: true, lastSeen: new Date(),
    location: { type: "Point", coordinates: [longitude, latitude] },
    status: "Active",
  });
  res.json({ success: true });
});

router.post("/set-offline", staffAuth, async (req, res) => {
  const staff = await Staff.findById(req.user.id);
  if (!staff || !staff.assignedVehicleId) return res.json({ success: true });

  await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, {
    isOnline: false, lastSeen: new Date(), status: "Inactive",
  });
  res.json({ success: true });
});

router.post("/ping-vehicle", staffAuth, async (req, res) => {
  try {
    const driverId = req.user._id;

    // 1. Pehle Driver (Staff) ko find karo
    const driver = await Staff.findById(driverId);

    // Agar driver nahi mila ya usko gadi assign nahi hai to 404
    if (!driver || !driver.assignedVehicleId) {
      return res.status(404).json({ success: false, message: "No vehicle assigned to this driver" });
    }

    // 2. Ab Vehicle ko uski ID se find karo
    const vehicle = await Vehicle.findById(driver.assignedVehicleId);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found in database" });
    }

    // 3. Status Update karo
    vehicle.isOnline = true;
    vehicle.lastSeen = new Date();

    await vehicle.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Ping Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/set-vehicle-offline", staffAuth, async (req, res) => {
  try {
    const driverId = req.user._id;
    await Vehicle.findOneAndUpdate(
      { driverId: driverId },
      { isOnline: false, lastSeen: new Date(), status: "Inactive" }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;