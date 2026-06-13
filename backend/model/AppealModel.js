const mongoose = require("mongoose");
const { Schema } = mongoose;

const AppealSchema = new Schema({
  citizenId: {
    type: Schema.Types.ObjectId,
    ref: "Citizen",
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  evidenceUrl: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  adminNotes: {
    type: String,
    default: "",
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: String,
    default: "",
  }
}, { timestamps: true });

module.exports = mongoose.model("Appeal", AppealSchema);
