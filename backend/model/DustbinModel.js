const mongoose = require("mongoose");

// Dustbin Schema
const DustbinSchema = new mongoose.Schema({
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Office",
    required: true,
  },

  name: { type: String, required: true },
  area: { type: String },

  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },

  status: {
    type: String,
    enum: ["clean", "overflow", "missed"],
    default: "clean",
  },

  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    default: null,
  },

  lastCleanedAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

DustbinSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Dustbin", DustbinSchema);
