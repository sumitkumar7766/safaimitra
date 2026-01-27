const mongoose = require("mongoose");
const { Schema } = mongoose;

// Handle both export styles (function or { default: function })
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm.default || plm;

// Route Schema
const RouteSchema = new mongoose.Schema({
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },
    name: { type: String, required: true },   // e.g. "Ward-12 Morning"
    code: { type: String, unique: true },     // e.g. "W12-M"
    active: { type: Boolean, default: true }
}, { timestamps: true });

RouteSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Route", RouteSchema);