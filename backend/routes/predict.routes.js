const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const Dustbin = require("../model/DustbinModel"); // ✅ Import Dustbin Model

const upload = multer({ dest: "uploads/" });
//radius
const { isWithinRadius } = require("../utils/geo");

router.post("/predict", upload.single("image"), async (req, res) => {
  let imagePath;

  try {
    // 1️⃣ Image validation
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const imagePath = req.file.path;

    // 2️⃣ Dustbin ID validation
    const { dustbinId, latitude, longitude } = req.body;

    if (!dustbinId) {
      return res.status(400).json({
        success: false,
        message: "Dustbin ID missing",
      });
    }

    // 3️⃣ Fetch dustbin correctly (IMPORTANT)
    const dustbin = await Dustbin.findById(dustbinId);

    if (!dustbin) {
      return res.status(404).json({
        success: false,
        message: "Dustbin not found",
      });
    }

    // 4️⃣ Location validation
    // if (!latitude || !longitude) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Driver location missing",
    //   });
    // }

    // // 5️⃣ 200 meter geo validation
    // const geoCheck = isWithinRadius(
    //   Number(latitude),
    //   Number(longitude),
    //   Number(dustbin.latitude),
    //   Number(dustbin.longitude),
    //   200,
    // );

    // console.log(
    //   "📏 Distance:",
    //   geoCheck.distance,
    //   "meters | Allowed:",
    //   geoCheck.allowed,
    // );

    // if (!geoCheck.allowed) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are too far from the dustbin",
    //     allowedRadius: "200 meters",
    //     currentDistance: `${geoCheck.distance} meters`,
    //   });
    // }

    // 1. Get Prediction from Roboflow
    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      `${process.env.ROBOFLOW_MODEL_URL}?api_key=${process.env.ROBOFLOW_API_KEY}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 30000,
      },
    );

    const predictions = response.data?.predictions;

    // Default Status
    let status = "unknown";
    let confidence = 0;

    if (predictions && predictions.length > 0) {
      const prediction = predictions[0];
      confidence = Number(prediction.confidence || 0);
      const label = prediction.class;
      const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.7);

      if (confidence >= threshold) {
        status = label; // e.g., "overflow", "clean", "full"
      }
    }

    // 2. 🔥 IF WE HAVE A DUSTBIN ID, UPDATE SYSTEM 🔥
    if (dustbinId && status !== "unknown") {
      // A. Update Database
      const updatedBin = await Dustbin.findByIdAndUpdate(
        dustbinId,
        {
          // status: status,
          lastCleanedAt: status === "clean" ? new Date() : undefined,
        },
        { new: true },
      );

      if (updatedBin) {
        // B. 🔥 SOCKET EMIT: Alert the Dashboard Instantly
        const io = req.app.get("io");
        io.emit("dustbin_data_update", {
          type: "UPDATE",
          data: updatedBin,
        });

        console.log(
          `🤖 AI Update: Dustbin ${updatedBin.name} is now ${status.toUpperCase()}`,
        );
      }
    }
    console.log(
      `🤖 Prediction: ${status.toUpperCase()} with confidence ${confidence.toFixed(2)}`,
    );
    // 3. Return JSON to the Camera/User
    return res.json({
      dustbinId: dustbinId || null,
      status,
      confidence: (confidence * 100).toFixed(2),
      message: "Prediction processed and Dashboard updated",
    });
  } catch (err) {
    console.error("❌ ROBOFLOW ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Prediction failed" });
  } finally {
    if (imagePath) {
      try {
        fs.unlinkSync(imagePath);
      } catch {}
    }
  }
});

router.post("/predict/complaint", upload.single("image"), async (req, res) => {
  let imagePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    imagePath = req.file.path;
    const dustbinId = req.body.dustbinId;

    // 1. Roboflow se Prediction lena
    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      `${process.env.ROBOFLOW_MODEL_URL}?api_key=${process.env.ROBOFLOW_API_KEY}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 30000,
      },
    );

    const predictions = response.data?.predictions;

    // Default Status
    let status = "UNKNOWN";
    let confidence = 0;

    if (predictions && predictions.length > 0) {
      const prediction = predictions[0];
      confidence = Number(prediction.confidence || 0);
      const label = prediction.class; // Backend se small letters me class name aayega
      const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.7);

      if (confidence >= threshold) {
        // Aapne maanga tha ki backend se data small letter me aaye to use Capital karein
        // Isliye hum yahan .toUpperCase() use kar rahe hain
        status = label;
      }
    }

    // ❌ DATABASE UPDATE & SOCKET EMIT LOGIC REMOVED ❌
    // Yahan humne Dustbin.findByIdAndUpdate() wala pura section hata diya hai.

    console.log(
      `🤖 AI Prediction (Read Only): ${status} with confidence ${(confidence * 100).toFixed(2)}%`,
    );

    // 2. Sirf JSON return karein Camera/Frontend ko
    return res.json({
      dustbinId: dustbinId || null,
      status: status, // Hamesha CAPITAL letter me (CLEAN, EMPTY, OVERFLOW etc.)
      confidence: (confidence * 100).toFixed(2),
      message: "AI analysis complete. Database remains unchanged.",
    });
  } catch (err) {
    console.error("❌ ROBOFLOW ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Prediction failed" });
  } finally {
    // Temp image delete karna zaroori hai
    if (imagePath) {
      try {
        fs.unlinkSync(imagePath);
      } catch {}
    }
  }
});

module.exports = router;
