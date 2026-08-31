const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const axios = require("axios");
const mongoose = require("mongoose");
const Dustbin = require("../model/DustbinModel");

const uploadDir = process.env.VERCEL ? os.tmpdir() : "uploads/";
if (!process.env.VERCEL && !fs.existsSync("uploads/")) {
  fs.mkdirSync("uploads/", { recursive: true });
}
const upload = multer({ dest: uploadDir });

/**
 * Helper to call Roboflow AI API honestly with Base64 payload
 */
async function callRoboflowInference(imagePath) {
  const modelUrl = process.env.ROBOFLOW_MODEL_URL || "https://classify.roboflow.com/dustbin-status/5";
  const apiKey = process.env.ROBOFLOW_API_KEY || "7vazEt8rNpsG1ha6iBeu";

  if (!fs.existsSync(imagePath)) {
    throw new Error("Uploaded image file not found on disk");
  }

  // 1. Convert image to Base64 (Roboflow Hosted Inference required format)
  const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

  console.log(`📡 Sending Image to Roboflow (${(imageBase64.length / 1024).toFixed(1)} KB base64)...`);

  const response = await axios.post(
    `${modelUrl}?api_key=${apiKey}`,
    imageBase64,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000, // 30s timeout to prevent premature aborts
    }
  );

  const data = response.data;
  console.log("📥 Roboflow Raw Output:", JSON.stringify(data));

  let rawClass = "unknown";
  let confidence = 0.0;

  // Extract from Roboflow Classification Response
  if (data.top && typeof data.top === "string") {
    rawClass = data.top;
    confidence = Number(data.confidence || 0);
  } else if (Array.isArray(data.predictions) && data.predictions.length > 0) {
    const topPred = data.predictions[0];
    rawClass = topPred.class || topPred.label || "unknown";
    confidence = Number(topPred.confidence || 0);
  } else if (data.predictions && typeof data.predictions === "object") {
    const entries = Object.entries(data.predictions);
    if (entries.length > 0) {
      entries.sort((a, b) => (b[1]?.confidence || b[1] || 0) - (a[1]?.confidence || a[1] || 0));
      rawClass = entries[0][0];
      confidence = Number(entries[0][1]?.confidence || entries[0][1] || 0);
    }
  }

  const normalized = rawClass.toLowerCase();
  let status = normalized;
  let label = "Garbage Detected";
  let severity = "HIGH";

  if (normalized.includes("clean") || normalized.includes("empty")) {
    status = "clean";
    label = "Dustbin Clean & Ready";
    severity = "LOW";
  } else if (normalized.includes("overflow") || normalized.includes("full")) {
    status = "overflowing";
    label = "Garbage Overflow Detected";
    severity = "HIGH";
  } else if (normalized.includes("half") || normalized.includes("moderate")) {
    status = "half_full";
    label = "Dustbin Partially Full";
    severity = "MEDIUM";
  }

  return {
    rawClass,
    status,
    confidence,
    label,
    severity,
    inferenceId: data.inference_id || null,
    time: data.time || null,
  };
}

// ─── UNIFIED PREDICT / VERIFY ROUTE (Driver & Citizen) ─────────────────────────
router.post(
  ["/predict", "/verify-image", "/citizen/verify-image"],
  upload.single("image"),
  async (req, res) => {
    let imagePath;

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Image file is required for prediction" });
      }

      imagePath = req.file.path;
      const { dustbinId, latitude, longitude } = req.body;

      console.log(
        `📸 [Image Upload Received] File: ${req.file.originalname || req.file.filename} (${(req.file.size / 1024).toFixed(1)} KB) | BinID: ${dustbinId || "N/A"}`
      );

      let dustbin = null;
      if (dustbinId && mongoose.Types.ObjectId.isValid(dustbinId)) {
        try {
          dustbin = await Dustbin.findById(dustbinId);
        } catch (e) {}
      }

      // Execute Honest Roboflow AI Prediction
      const aiResult = await callRoboflowInference(imagePath);

      console.log(
        `🤖 [Roboflow Honest Result] Class: "${aiResult.rawClass}" -> Status: "${aiResult.status}" | Confidence: ${(aiResult.confidence * 100).toFixed(2)}%`
      );

      // Update Dustbin status in Database if valid dustbin
      if (dustbin && dustbin._id) {
        try {
          const isClean = aiResult.status === "clean";
          const updatedBin = await Dustbin.findByIdAndUpdate(
            dustbin._id,
            {
              status: isClean ? "clean" : aiResult.status,
              fillPercentage: isClean ? 0 : Math.round(aiResult.confidence * 100),
              lastCleanedAt: isClean ? new Date() : dustbin.lastCleanedAt,
            },
            { new: true }
          );

          if (updatedBin) {
            const io = req.app.get("io");
            if (io) {
              io.emit("dustbin_data_update", {
                type: "UPDATE",
                data: updatedBin,
              });
            }
          }
        } catch (e) {
          console.warn("Could not sync dustbin model:", e.message);
        }
      }

      return res.json({
        success: true,
        dustbinId: dustbinId || null,
        status: aiResult.status,
        confidence: (aiResult.confidence * 100).toFixed(2),
        label: aiResult.label,
        result: {
          verified: true,
          status: aiResult.status,
          confidence: aiResult.confidence,
          label: aiResult.label,
          description: `Roboflow vision classified bin condition as ${aiResult.rawClass}.`,
          severity: aiResult.severity,
          wasteType: "Municipal Solid Waste",
          modelEngine: "Roboflow dustbin-status/5",
          inferenceId: aiResult.inferenceId,
        },
        message: "Prediction processed honestly by Roboflow AI",
      });
    } catch (err) {
      console.error("❌ Roboflow Prediction Error:", err.response?.data || err.message);

      return res.status(500).json({
        success: false,
        error: err.response?.data || err.message,
        message: "Roboflow model prediction failed. Please check network/model connectivity.",
      });
    } finally {
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch {}
      }
    }
  }
);

// ─── COMPLAINT PREDICTION ROUTE ────────────────────────────────────────────────
router.post("/predict/complaint", upload.single("image"), async (req, res) => {
  let imagePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file required" });
    }

    imagePath = req.file.path;
    const dustbinId = req.body.dustbinId;

    console.log(`📸 [Complaint Image Received] BinID: ${dustbinId || "N/A"}`);

    const aiResult = await callRoboflowInference(imagePath);

    return res.json({
      success: true,
      dustbinId: dustbinId || null,
      status: aiResult.status.toUpperCase(),
      confidence: (aiResult.confidence * 100).toFixed(2),
      label: aiResult.label,
      modelEngine: "Roboflow dustbin-status/5",
      message: "AI analysis complete via Roboflow.",
    });
  } catch (err) {
    console.error("❌ Complaint Roboflow Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Roboflow prediction failed",
      error: err.message,
    });
  } finally {
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch {}
    }
  }
});

module.exports = router;

