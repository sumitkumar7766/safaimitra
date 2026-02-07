// routes/staff.js
const express = require("express");
const router = express.Router();
const Staff = require("../model/StaffModel");
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const Route = require("../model/RouteModel");
const Dustbin = require("../model/DustbinModel");
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

    let vehicleInfo = null;
    if (assignedVehicleId) {
      vehicleInfo = await Vehicle.findByIdAndUpdate(
        assignedVehicleId,
        { $set: { driverId: registeredStaff._id } },
        { new: true } // Return updated vehicle
      );
    }

    // Populate for frontend list
    const populatedStaff = await Staff.findById(registeredStaff._id).populate("assignedVehicleId", "vehicleNumber type status");

    // 🔥 SOCKET EMIT: Add to Staff List
    const io = req.app.get("io");
    io.emit("staff_list_update", { 
      type: "ADD", 
      data: populatedStaff 
    });

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

    // 🔥 SOCKET EMIT: Remove from Staff List
    const io = req.app.get("io");
    io.emit("staff_list_update", { 
      type: "DELETE", 
      id: staffId 
    });

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

    const updatedStaff = await Staff.findById(staffId).populate("assignedVehicleId", "vehicleNumber type status");

    // 🔥 SOCKET EMIT: Update Staff List
    const io = req.app.get("io");
    io.emit("staff_list_update", { 
      type: "UPDATE", 
      data: updatedStaff 
    });

    return res.json({ success: true, message: "Updated", staff: updatedStaff });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= REMOVE VEHICLE ================= */
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

    const updatedStaff = await Staff.findById(staffId).populate("assignedVehicleId");

    // 🔥 SOCKET EMIT: Update Staff List (Vehicle Removed)
    const io = req.app.get("io");
    io.emit("staff_list_update", { 
      type: "UPDATE", 
      data: updatedStaff 
    });

    res.json({ success: true, message: "Vehicle removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DASHBOARD (No Socket needed) ================= */
router.get("/dashboard", staffAuth, async (req, res) => {
  const staffId = req.user.id;

  try {
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    if (!staff.assignedVehicleId) {
      return res.json({ success: true, message: "No vehicle assigned", staff, vehicle: null, route: null, dustbins: [] });
    }

    const vehicle = await Vehicle.findById(staff.assignedVehicleId);
    if (!vehicle) return res.json({ success: true, staff, vehicle: null, route: null, dustbins: [] });

    let route = null;
    let regularDustbins = [];

    if (vehicle.routeId) {
      route = await Route.findById(vehicle.routeId);
      if (route) {
        regularDustbins = await Dustbin.find({ routeId: route._id, officeId: route.officeId });
      }
    }

    const assignedComplaints = await Complaint.find({
      assignedVehicleId: vehicle._id,
      status: { $in: ["assigned", "in_progress"] }
    }).populate("dustbinId");

    const formattedComplaints = assignedComplaints.map(complaint => {
      const binId = complaint.dustbinId ? complaint.dustbinId._id : complaint._id;
      const binName = complaint.dustbinId ? `🚨 ${complaint.dustbinId.name}` : `🚨 Alert: ${complaint.area}`;

      return {
        _id: binId,
        name: binName,
        area: complaint.area,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        status: "overflow",
        imageUrl: complaint.ComimageUrl || complaint.imageUrl,
        isEmergency: true,
        complaintId: complaint._id,
        lastCleanedAt: null
      };
    });

    const allStops = [...regularDustbins, ...formattedComplaints];

    return res.json({
      success: true,
      staff,
      vehicle,
      route,
      dustbins: allStops,
    });

  } catch (err) {
    console.error("Staff Dashboard Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LIVE LOCATION UPDATES (CRITICAL) ================= */
router.post("/update-vehicle-location", staffAuth, async (req, res) => {
  const staffId = req.user.id;
  const { latitude, longitude } = req.body;
  
  try {
    const staff = await Staff.findById(staffId);
    if (!staff || !staff.assignedVehicleId) return res.status(404).json({ success: false });

    // Update DB
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      staff.assignedVehicleId, 
      {
        latitude, 
        longitude, 
        isOnline: true, 
        lastSeen: new Date(),
        location: { type: "Point", coordinates: [longitude, latitude] },
        status: "Active",
      },
      { new: true } // Return updated doc
    );

    // 🔥 SOCKET EMIT: Live Map Tracking
    // Map listens to 'vehicle_location_update' to move the truck icon
    const io = req.app.get("io");
    io.emit("vehicle_location_update", updatedVehicle);

    res.json({ success: true });
  } catch(err) {
    console.error("Loc Update Err:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= PING / OFFLINE ================= */
router.post("/set-offline", staffAuth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.user.id);
    if (!staff || !staff.assignedVehicleId) return res.json({ success: true });
    console.log(`Setting vehicle ${staff.assignedVehicleId} offline for staff ${staff._id}`);

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      staff.assignedVehicleId, 
      {
        isOnline: false, 
        lastSeen: new Date(), 
        status: "Inactive",
      },
      { new: true }
    );

    // 🔥 SOCKET EMIT: Turn Marker Grey
    const io = req.app.get("io");
    io.emit("vehicle_location_update", updatedVehicle);

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ success: false });
  }
});

router.post("/ping-vehicle", staffAuth, async (req, res) => {
  try {
    const driverId = req.user.id;
    const driver = await Staff.findById(driverId);

    if (!driver || !driver.assignedVehicleId) {
      return res.status(404).json({ success: false, message: "No vehicle assigned" });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
        driver.assignedVehicleId,
        {
            isOnline: true,
            lastSeen: new Date()
        },
        { new: true }
    );

    if (!vehicle) return res.status(404).json({ success: false });

    // 🔥 SOCKET EMIT: Keep Marker Active (Heartbeat)
    const io = req.app.get("io");
    io.emit("vehicle_location_update", vehicle);

    res.json({ success: true });
  } catch (err) {
    console.error("Ping Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Redundant route removed/merged (set-vehicle-offline was duplicate of set-offline)

module.exports = router;