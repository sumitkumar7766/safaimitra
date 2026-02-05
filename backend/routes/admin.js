const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const adminAuth = require("../middleware/adminAuth");
// const { route } = require("./office"); // Unused import removed for cleaner code

// 1. ADMIN REGISTRATION (Emit 'ADD' event)
router.post("/register", adminAuth, async (req, res) => {
  try {
    const newAdmin = new Admin({
      name: req.body.name,
      email: req.body.email,
      username: req.body.email,
      role: "admin",
    });

    // Save using passport-local-mongoose
    const admin = await Admin.register(newAdmin, req.body.password);

    // 🔥 SOCKET.IO LOGIC START 🔥
    const io = req.app.get("io");
    
    // Emit event to all clients that a new admin was added
    io.emit("admin_list_update", { 
      type: "ADD", 
      data: {
        _id: admin._id,
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt
      } 
    });
    // 🔥 SOCKET.IO LOGIC END 🔥

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

// 2. GET ALL ADMINS (No Socket needed here, just standard fetch)
router.get("/", adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      admins: admins.map((a) => ({
        _id: a._id,
        id: a._id.toString(),
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

// 3. DELETE ADMIN (Emit 'DELETE' event)
router.delete("/delete/:id", adminAuth, async (req, res) => {
  try {
    const adminId = req.params.id;

    const deletedAdmin = await Admin.findByIdAndDelete(adminId);
    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 🔥 SOCKET.IO LOGIC START 🔥
    const io = req.app.get("io");
    
    // Emit event so frontend removes this ID from the list immediately
    io.emit("admin_list_update", { 
      type: "DELETE", 
      id: adminId 
    });
    // 🔥 SOCKET.IO LOGIC END 🔥

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