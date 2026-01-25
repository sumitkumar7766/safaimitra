const express = require("express");
const router = express.Router();
const Admin = require("../model/AdminModel");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.SECRET_KEY || "safaimitra-secret";

// POST login (Frontend axios.post ke liye)
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    console.log("Admin login attempt:", username);

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username aur Password dono required hain",
        });
    }

    try {
        // passport-local-mongoose ka static authenticate use karo
        Admin.authenticate()(username, password, (err, user, info) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Server error during authentication",
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Username ya Password galat hai",
                });
            }

            // JWT generate karo
            const token = jwt.sign(
                {
                    id: user._id,
                    role: user.role,
                },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                },
            });
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// POST logout
router.post("/logout", (req, res) => {
    // Agar tum cookie me token store kar rahe ho
    console.log("Admin logout attempt");
    res.clearCookie("token", {
        path: "/",
    });

    return res.json({
        success: true,
        message: "Logout successful",
    });
});


module.exports = router;
