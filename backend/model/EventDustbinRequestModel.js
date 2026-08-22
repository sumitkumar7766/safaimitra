const mongoose = require("mongoose");

const EventDustbinRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Citizen",
      required: true,
      index: true,
    },
    citizenName: { type: String, default: "" },
    citizenPhone: { type: String, default: "" },
    citizenEmail: { type: String, default: "" },
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      index: true,
    },
    cityName: { type: String, default: "", index: true },

    // 1. Event Information
    event: {
      type: {
        type: String,
        enum: [
          "Marriage",
          "Birthday",
          "Religious",
          "Political",
          "Community",
          "School/College",
          "Festival",
          "Corporate",
          "Other",
        ],
        required: true,
      },
      name: { type: String, required: true },
      expectedGuests: { type: Number, required: true, min: 1 },
      date: { type: String, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      durationHours: { type: Number, required: true, min: 0.5 },
      venueType: {
        type: String,
        enum: [
          "Open Ground",
          "Community Hall",
          "Marriage Hall",
          "School/College",
          "Road/Public Area",
          "Religious Place",
          "Other",
        ],
        default: "Community Hall",
      },
      foodService: { type: Boolean, default: false },
      foodType: {
        type: String,
        enum: ["Full Meal", "Snacks", "Both", "None"],
        default: "None",
      },
      foodPlates: { type: Number, default: 0 },
      wasteTypes: [{ type: String }],
      notes: { type: String, default: "" },
    },

    // 2. Event Location
    location: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    // 3. Document Proofs (Cloudinary secure URLs)
    documents: {
      eventProof: {
        url: { type: String, required: true },
        type: { type: String, default: "image/jpeg" },
        originalFilename: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
        verificationStatus: {
          type: String,
          enum: ["VERIFIED", "FLAGGED", "UNVERIFIED", "PENDING"],
          default: "PENDING",
        },
      },
      identityProof: {
        url: { type: String, default: "" },
        type: { type: String, default: "" },
        originalFilename: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
        verificationStatus: {
          type: String,
          enum: ["VERIFIED", "FLAGGED", "UNVERIFIED", "PENDING", "NOT_PROVIDED"],
          default: "PENDING",
        },
      },
    },

    // 4. AI & Deterministic Waste Analysis
    aiAnalysis: {
      documentValid: { type: Boolean, default: true },
      eventTypeDetected: { type: String, default: "" },
      extractedEventDate: { type: String, default: "" },
      extractedLocation: { type: String, default: "" },
      extractedOrganizer: { type: String, default: "" },
      documentConfidence: { type: Number, default: 85 }, // 0 to 100

      wasteRisk: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM",
      },
      estimatedWasteKg: { type: Number, default: 0 },

      recommendedBins: {
        wet: { type: Number, default: 1 },
        dry: { type: Number, default: 1 },
        general: { type: Number, default: 1 },
        total: { type: Number, default: 3 },
      },

      collectionFrequency: { type: Number, default: 1 }, // times per day
      confidenceScore: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "HIGH",
      },
      confidenceScoreNumeric: { type: Number, default: 90 },
      reasoning: { type: String, default: "" },
      warnings: [{ type: String }],
      modelVersion: { type: String, default: "SafaiMitra-WasteEngine-v2.1" },
      analyzedAt: { type: Date, default: Date.now },
    },

    // 5. Admin Review & Decision
    adminDecision: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "MODIFIED", "REJECTED"],
        default: "PENDING",
      },
      approvedBins: {
        wet: { type: Number, default: 0 },
        dry: { type: Number, default: 0 },
        general: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      approvedCollectionFrequency: { type: Number, default: 1 },
      adminComment: { type: String, default: "" },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      adminName: { type: String, default: "" },
      decidedAt: { type: Date },
    },

    // 6. Dustbin & Fleet Allocation
    allocation: {
      vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
      vehicleNumber: { type: String, default: "" },
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
      staffName: { type: String, default: "" },
      allocatedDustbinIds: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Dustbin" },
      ],
      collectionSchedule: { type: String, default: "" },
      allocatedAt: { type: Date },
    },

    // 7. Post-Event Actual Outcome Feedback Loop
    actualResult: {
      actualWasteKg: { type: Number, default: null },
      actualWetWasteKg: { type: Number, default: null },
      actualDryWasteKg: { type: Number, default: null },
      numberOfCollections: { type: Number, default: null },
      overflowOccurred: { type: Boolean, default: false },
      staffRemarks: { type: String, default: "" },
      beforeImage: { type: String, default: "" },
      afterImage: { type: String, default: "" },
      submittedAt: { type: Date },
    },

    // 8. Lifecycle Status
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "DOCUMENT_VERIFICATION",
        "AI_ANALYSIS",
        "PENDING_ADMIN_REVIEW",
        "APPROVED",
        "MODIFIED",
        "REJECTED",
        "ALLOCATED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "SUBMITTED",
      index: true,
    },

    // 9. Full Audit Log
    auditLog: [
      {
        user: { type: String, default: "System" },
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        previousValue: { type: String, default: "" },
        newValue: { type: String, default: "" },
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "EventDustbinRequest",
  EventDustbinRequestSchema
);
