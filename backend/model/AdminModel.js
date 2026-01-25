const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

const AdminSchema = new Schema({
  name: {
    type: String,
    required: true,   // typo fix: require -> required
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  role: { type: String, default: "admin" },
});

AdminSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Admin", AdminSchema);
