const mongoose = require("mongoose");

// Vehicle Schema
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

  type: { 
    type: String 
  },

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
    enum: ["Active", "Inactive"], 
    default: "Inactive" 
  },

  latitude: { 
    type: Number, 
    default: null 
  },

  longitude: { 
    type: Number, 
    default: null 
  }

}, { timestamps: true });

module.exports = mongoose.model("Vehicle", VehicleSchema);
