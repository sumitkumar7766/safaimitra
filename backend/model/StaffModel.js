const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

const StaffSchema = new Schema(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["driver", "helper", "supervisor"],
      required: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      required: true,
    },

    assignedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },

    // optional: default role label
    systemRole: {
      type: String,
      default: "Staff",
    },
  },
  { timestamps: true }
);

// Add username + hash + salt automatically
StaffSchema.plugin(passportLocalMongoose, {
  usernameField: "username",
});

module.exports = mongoose.model("Staff", StaffSchema);
