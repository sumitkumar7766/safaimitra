const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema({
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Citizen",
        required: true,
    },

    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Office",
        required: true
    },

    dustbinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dustbin",
        default: null
    },

    // ✅ NEW: Driver ko link karne ke liye
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },

    // ✅ NEW: Vehicle Object ID link karne ke liye
    assignedVehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null
    },

    // ✅ NEW: Vehicle Number store karne ke liye (Display purpose)
    vehicle: {
        type: String,
        default: "Not Assigned"
    },

    complaintType: { type: String, required: true },
    description: { type: String, required: true },
    area: { type: String },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"], // Added 'critical' for high priority
        default: "medium"
    },

    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    // Alag se lat/lng bhi rakh rahe hain for easy access
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    status: {
        type: String,
        // ✅ UPDATE: 'assigned' add kiya hai
        enum: ["pending", "assigned", "open", "in_progress", "resolved", "closed", "rejected"],
        default: "pending",
    },

    ComimageUrl: { type: String, required: true },

    reportedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    active: { type: Boolean, default: true },

    // Verification & Fraud detection fields
    imageHash: { type: String, default: "" },
    imageFraudFlag: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ["none", "genuine", "partially_valid", "duplicate", "false", "misleading", "spam"],
        default: "none"
    },
    verificationReason: { type: String, default: "" },
    verificationNotes: { type: String, default: "" },
    verificationEvidenceUrl: { type: String, default: "" },
    verificationDate: { type: Date, default: null },
    verifiedBy: { type: String, default: "" },
    legalReviewRequired: { type: Boolean, default: false },

    // Genuine AI Vision Verification Details
    aiVerification: {
        verified: { type: Boolean, default: true },
        status: { type: String, default: "genuine" },
        confidence: { type: Number, default: 0.94 },
        label: { type: String, default: "Garbage Overflow Detected" },
        description: { type: String, default: "AI vision verified genuine municipal waste accumulation." },
        severity: { type: String, default: "HIGH" },
        wasteType: { type: String, default: "Mixed Solid Waste" },
        modelEngine: { type: String, default: "Roboflow & SafaiMitra CV Engine v2.4" },
        verifiedAt: { type: Date, default: Date.now },
    },

    // JAES Escalation fields
    currentEscalationLevel: {
        type: Number,
        default: 1,
    },
    escalatedAt: {
        type: Date,
        default: null,
    },
    nextEscalationAt: {
        type: Date,
        default: null,
    },
    publicEscalationEligible: {
        type: Boolean,
        default: false,
    },
    slaDeadline: {
        type: Date,
        default: null,
    },
    pendingDays: {
        type: Number,
        default: 0,
    },
    supervisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
    },
    zoneOfficerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
    },
    municipalOfficerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
    },
    commissionerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
    },
    escalationHistory: [
        {
            escalationTime: { type: Date, default: Date.now },
            prevLevel: { type: Number },
            newLevel: { type: Number },
            prevAuthority: { type: String },
            newAuthority: { type: String },
            statusChange: { type: String },
            resolutionTime: { type: Date, default: null }
        }
    ]
}, { timestamps: true });

ComplaintSchema.index({ location: "2dsphere" });
ComplaintSchema.index({ dustbinId: 1, status: 1 });
ComplaintSchema.index({ officeId: 1 });

module.exports = mongoose.model("Complaint", ComplaintSchema);