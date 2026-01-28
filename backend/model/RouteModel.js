const mongoose = require("mongoose");

// Route Schema
const RouteSchema = new mongoose.Schema({
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Office",
    required: true,
  },

  name: {
    type: String,
    required: true, // e.g. "Ward-12 Morning Route"
  },

  description: {
    type: String, // Optional details
  },

  // Is route me kaun-kaun se dustbins hain
  dustbins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dustbin",
    },
  ],

  // Is route par kaun sa vehicle assigned hai (optional)
  assignedVehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    default: null,
  },

  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Route", RouteSchema);
