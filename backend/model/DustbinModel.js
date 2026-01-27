const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

// Dustbin Schema
const DustbinSchema = new mongoose.Schema({
  officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },

  label: { type: String }, // "Near School Gate"
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },

  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

DustbinSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Dustbin", DustbinSchema);