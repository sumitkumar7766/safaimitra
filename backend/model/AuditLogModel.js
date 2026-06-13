const mongoose = require("mongoose");
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
  adminName: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true, // "POINT_ADDED", "POINT_DEDUCTED", "STRIKE_ADDED", "SUSPENSION", "APPEAL_DECISION", "VERIFICATION_DECISION", "LEGAL_REVIEW"
  },
  citizenId: {
    type: Schema.Types.ObjectId,
    ref: "Citizen",
    default: null,
  },
  complaintId: {
    type: Schema.Types.ObjectId,
    ref: "Complaint",
    default: null,
  },
  reason: {
    type: String,
    required: true,
  },
  evidenceReference: {
    type: String,
    default: "",
  }
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
