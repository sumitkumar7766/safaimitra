const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

const OfficeSchema = new Schema(
  {
    stateName: {
      type: String,
      required: true,
      trim: true,
    },

    cityName: {
      type: String,
      required: true,
      trim: true,
    },

    officeName: {
      type: String,
      required: true,
      trim: true,
    },

    adminName: {
      type: String,
      required: true,
      trim: true,
    },

    adminEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true, // isko hash karke store karna best practice hai
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

OfficeSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Office", OfficeSchema);