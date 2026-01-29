// routes/staff.js
const express = require("express");
const router = express.Router();
const Staff = require("../model/StaffModel");
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const Route = require("../model/RouteModel");
const Dustbin = require("../model/DustbinModel");
const officeAuth = require("../middleware/officeAuth");
const staffAuth = require("../middleware/staffAuth");

/* ================= STAFF REGISTER ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, role, phone, assignedVehicleId } = req.body;
  const officeId = req.user.id;
  console.log(name, role, assignedVehicleId)

  if (!name || !role || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name, Role aur Username required hai",
    });
  }

  try {
    // Phone duplicate check
    if (phone) {
      const exists = await Staff.findOne({ phone });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Is phone number se staff already registered hai",
        });
      }
    }

    // 🔐 Auto password: last 5 digits of mobile number
    const password = phone?.toString().slice(-5);
    const username = phone;

    const staff = new Staff({
      officeId,
      name,
      role,
      phone,
      assignedVehicleId: assignedVehicleId || null,
      active: true,
      username, // ensure username is set
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
      loginInfo: {
        username,
        password, // so office can tell staff their login
      },
    });
  } catch (err) {
    console.error("Staff Register Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= GET STAFF LIST (OFFICE WISE) ================= */
/* ================= GET STAFF BY OFFICE ID ================= */
router.get("/list/:officeId", officeAuth, async (req, res) => {
  const { officeId } = req.params;

  try {
    const staffList = await Staff.find({ officeId })
      .populate("assignedVehicleId", "vehicleNumber type status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      staff: staffList,
    });
  } catch (err) {
    console.error("Get Staff Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= DELETE STAFF ================= */
router.delete("/delete/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;

  try {
    // 1. Staff find karo (verify office ownership)
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found for this office",
      });
    }

    // 2. Office se staffId remove karo
    await Office.findByIdAndUpdate(
      officeId,
      { $pull: { staff: staff._id } }
    );


    // 3. Agar kisi vehicle se assigned tha to wahan se bhi hatao
    if (staff.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(
        staff.assignedVehicleId,
        { $unset: { driverId: "" } }
      );
    }

    // 4. Staff delete karo
    await Staff.findByIdAndDelete(staffId);

    return res.json({
      success: true,
      message: "Staff successfully deleted",
    });
  } catch (err) {
    console.error("Delete Staff Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= UPDATE STAFF ================= */
router.put("/update/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;

  const { name, role, phone, assignedVehicleId } = req.body;

  try {
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found for this office",
      });
    }

    // Phone duplicate check
    if (phone && phone !== staff.phone) {
      const exists = await Staff.findOne({ phone });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Is phone number se koi aur staff already registered hai",
        });
      }
    }

    const oldVehicleId = staff.assignedVehicleId?.toString() || null;
    const newVehicleId =
      role === "driver" && assignedVehicleId ? assignedVehicleId : null;

    let reassignedFrom = null;

    // 🔁 Agar ye vehicle kisi aur staff ko already assigned hai
    if (newVehicleId) {
      const otherStaff = await Staff.findOne({
        _id: { $ne: staffId },
        assignedVehicleId: newVehicleId,
        officeId,
      });

      if (otherStaff) {
        // // us staff se vehicle hata do
        // otherStaff.assignedVehicleId = null;
        // await otherStaff.save();

        // reassignedFrom = otherStaff.name;
        return res.status(400).json({
          success: false,
          message: "Ye vehicle already kisi aur route me assigned hai",
        });
      }
    }

    // Staff update
    staff.name = name;
    staff.role = role;
    staff.phone = phone;
    staff.assignedVehicleId = newVehicleId;
    await staff.save();

    // Old vehicle se driver hatao
    if (oldVehicleId && oldVehicleId !== newVehicleId) {
      await Vehicle.findByIdAndUpdate(oldVehicleId, {
        $unset: { driverId: "" },
      });
    }

    // New vehicle me driver set karo
    if (newVehicleId && oldVehicleId !== newVehicleId) {
      await Vehicle.findByIdAndUpdate(newVehicleId, {
        driverId: staff._id,
      });
    }

    return res.json({
      success: true,
      message: reassignedFrom
        ? `Vehicle was reassigned from ${reassignedFrom} to ${staff.name}`
        : "Staff updated successfully",
      staff,
      reassignedFrom,
    });
  } catch (err) {
    console.error("Update Staff Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.put("/remove-vehicle/:staffId", officeAuth, async (req, res) => {
  const { staffId } = req.params;
  const officeId = req.user.id;

  try {
    const staff = await Staff.findOne({ _id: staffId, officeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (staff.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, {
        $unset: { driverId: "" },
      });
    }

    staff.assignedVehicleId = null;
    await staff.save();

    res.json({
      success: true,
      message: "Vehicle removed from staff",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/dashboard", staffAuth, async (req, res) => {
  const staffId = req.user.id;

  try {
    // 1. Staff nikalo
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // 2. Staff ke assigned vehicle ko lao
    if (!staff.assignedVehicleId) {
      return res.json({
        success: true,
        message: "No vehicle assigned",
        staff,
        vehicle: null,
        route: null,
        dustbins: [],
      });
    }

    const vehicle = await Vehicle.findById(staff.assignedVehicleId);
    if (!vehicle || !vehicle.routeId) {
      return res.json({
        success: true,
        staff,
        vehicle,
        route: null,
        dustbins: [],
      });
    }

    // 3. Vehicle ka route
    const route = await Route.findById(vehicle.routeId);

    // 4. Us route ke saare dustbins
    const dustbins = await Dustbin.find({
      routeId: route._id,
      officeId: route.officeId,
    });

    return res.json({
      success: true,
      staff,
      vehicle,
      route,
      dustbins,
    });
  } catch (err) {
    console.error("Staff Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/update-vehicle-location", staffAuth, async (req, res) => {
  const staffId = req.user.id;
  const { latitude, longitude } = req.body;

  const staff = await Staff.findById(staffId);
  if (!staff || !staff.assignedVehicleId) {
    return res.status(404).json({ success: false });
  }

  await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, {
    latitude,
    longitude,
    isOnline: true,
    lastSeen: new Date(),
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
  });

  res.json({ success: true });
});

router.post("/set-offline", staffAuth, async (req, res) => {
  const staff = await Staff.findById(req.user.id);
  if (!staff || !staff.assignedVehicleId) {
    return res.json({ success: true });
  }

  await Vehicle.findByIdAndUpdate(staff.assignedVehicleId, {
    isOnline: false,
    lastSeen: new Date(),
  });

  res.json({ success: true });
});



module.exports = router;
