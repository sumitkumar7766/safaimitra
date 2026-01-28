const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const adminAuth = require("../middleware/adminAuth");
const { route } = require("./office");

// Admin Registration
router.post("/register", adminAuth, async (req, res) => {
  try {
    const newAdmin = new Admin({
      name: req.body.name,
      email: req.body.email,
      username: req.body.email,
      role: "admin",
    });
    console.log(newAdmin);

    // passport-local-mongoose method
    const admin = await Admin.register(newAdmin, req.body.password);

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    if (err.name === "UserExistsError") {
      return res.status(409).json({ message: "Admin already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/", adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      admins: admins.map((a) => ({
        _id: a._id,                 // raw Mongo id
        id: a._id.toString(),       // friendly id for frontend
        name: a.name,
        email: a.email,
        username: a.username,
        role: a.role,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/delete/:id", adminAuth, async (req, res) => {
  try {
    const adminId = req.params.id;

    const deletedAdmin = await Admin.findByIdAndDelete(adminId);
    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


module.exports = router;
