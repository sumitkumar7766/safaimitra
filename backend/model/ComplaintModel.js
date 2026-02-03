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
}, { timestamps: true });

ComplaintSchema.index({ location: "2dsphere" });
ComplaintSchema.index({ dustbinId: 1, status: 1 });
ComplaintSchema.index({ officeId: 1 });

module.exports = mongoose.model("Complaint", ComplaintSchema);