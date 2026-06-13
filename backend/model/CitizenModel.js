const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

const CitizenSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // Note: passport-local-mongoose automatically handles 'password' field
  address: {
    type: String,
    required: true,
  },
  // --- NEW FIELDS START ---
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Office", // Office model se link karne ke liye
    required: true,
  },
  cityName: {
    type: String,
    required: true,
  },
  // --- NEW FIELDS END ---
  pincode: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  trustScore: { type: Number, default: 0 },
  validComplaints: { type: Number, default: 0 },
  falseComplaints: { type: Number, default: 0 },
  consecutiveFalseComplaints: { type: Number, default: 0 },
  citizenLevel: { type: String, default: "Beginner Citizen" },
  areaRank: { type: Number, default: 0 },
  cityRank: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String, default: "" },
  strikeCount: { type: Number, default: 0 },
  role: { 
    type: String, 
    default: "citizen" 
  },
}, { timestamps: true });

// 2dsphere index geospatial queries ke liye zaroori hai
CitizenSchema.index({ location: "2dsphere" });

CitizenSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Citizen", CitizenSchema);