const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({ dest: "uploads/" });

router.post("/predict", upload.single("image"), async (req, res) => {
  let imagePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    imagePath = req.file.path;

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
      }
    );

    const predictions = response.data?.predictions;

    if (!predictions || predictions.length === 0) {
      return res.json({ status: "unknown", confidence: 0 });
    }

    const prediction = predictions[0];
    const confidence = Number(prediction.confidence || 0);
    const label = prediction.class;

    const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.7);

    let status = "unknown";
    if (confidence >= threshold) {
      status = label; // empty / medium / full
    }

    return res.json({
      dustbinId: req.body.dustbinId || null,
      status,
      confidence: (confidence * 100).toFixed(2),
    });

  } catch (err) {
    console.error(
      "❌ ROBOFLOW ERROR:",
      err.response?.data || err.message
    );
    return res.status(500).json({ message: "Prediction failed" });
  } finally {
    if (imagePath) {
      try {
        fs.unlinkSync(imagePath);
      } catch {}
    }
  }
});

module.exports = router;
