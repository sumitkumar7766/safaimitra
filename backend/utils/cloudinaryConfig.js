const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// 1. Explicitly load .env from the backend root folder
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 2. Debugging: Check if keys are loaded (Don't show full secret in logs)
console.log("Cloudinary Config Check:");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Loaded" : "❌ Missing");
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "✅ Loaded" : "❌ Missing");
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅ Loaded" : "❌ Missing");

// 3. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 4. Setup Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'safaimitra_dustbins',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

module.exports = upload;