const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");

// Manual Admin Registration
// router.post("/register", async (req, res) => {
//   try {
//     const newAdmin = new Admin({
//       name: req.body.name,
//       email: req.body.email,
//       username: req.body.email,
//       password: req.body.password,
//       role: "admin",
//     });
//     console.log(newAdmin);

//     // passport-local-mongoose method
//     const admin = await Admin.register(newAdmin, req.body.password);

//     res.status(201).json({
//       message: "Admin registered successfully",
//       admin: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         username: admin.email,
//         role: admin.role,
//       },
//     });
//   } catch (err) {
//     if (err.name === "UserExistsError") {
//       return res.status(409).json({ message: "Admin already exists" });
//     }
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;
