// routes/staff.js
const express = require("express");
const router = express.Router();
const Staff = require("../model/StaffModel");
const Vehicle = require("../model/VehicleModel");
const Office = require("../model/OfficeModel");
const officeAuth = require("../middleware/officeAuth");

/* ================= STAFF REGISTER ================= */
router.post("/register", officeAuth, async (req, res) => {
  const { name, role, phone, assignedVehicleId } = req.body;
  const officeId = req.user.id; // token se aayega

  console.log("Staff Register Attempt:", name, role, "Office:", officeId);

  if (!name || !role) {
    return res.status(400).json({
      success: false,
      message: "Name aur Role required hai",
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

    const staff = await Staff.create({
      officeId,
      name,
      role, // "driver" | "helper" | "supervisor"
      phone,
      assignedVehicleId: assignedVehicleId || null,
      active: true,
    });

    // Office ke andar staffId push karo
    await Office.findByIdAndUpdate(
      officeId,
      { $push: { staffId: staff._id } },
      { new: true }
    );

    // Sirf tab vehicle update karo jab assignedVehicleId ho
    if (assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(
        assignedVehicleId,
        { $set: { driverId: staff._id } },
        { new: true }
      );
    }

    return res.json({
      success: true,
      message: "Staff successfully registered",
      staff,
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
      { $pull: { staffId: staff._id } }
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
        // us staff se vehicle hata do
        otherStaff.assignedVehicleId = null;
        await otherStaff.save();

        reassignedFrom = otherStaff.name;
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

module.exports = router;
