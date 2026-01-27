const mongoose = require("mongoose");

// Staff Schema (SafaiMitra / Driver / Helper)
const StaffSchema = new mongoose.Schema({
  officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },

  name: { type: String, required: true },
  role: { type: String, enum: ["driver", "helper", "supervisor"], required: true },
  phone: { type: String, unique: true },

  assignedVehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle",
    default: null
  },

  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Staff", StaffSchema);
