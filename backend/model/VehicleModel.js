const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Office",
    required: true
  },

  vehicleNumber: {
    type: String,
    required: true,
    unique: true
  },

  type: { type: String },

  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    default: null
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    default: null
  },

  status: {
    type: String,
    enum: ["Active", "Inactive", "OnDuty", "Maintenance"], // 'OnDuty' status helpful rahega
    default: "Inactive"
  },

  // Location Data
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },

  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  
  // ✅ UPDATE: complaintBin ki jagah complaintId rakhein jo direct Complaint se link ho
  currentComplaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    default: null,
  }

}, { timestamps: true });

module.exports = mongoose.model("Vehicle", VehicleSchema);