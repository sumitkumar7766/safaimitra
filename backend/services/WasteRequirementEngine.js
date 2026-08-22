/**
 * WasteRequirementEngine.js
 * Deterministic Municipal Waste Calculation Engine for SafaiMitra
 */

// Configurable municipal parameters
const DEFAULT_CONFIG = {
  baseWasteRateKgPerPerson: 0.65, // Base generation per guest
  binCapacityKg: 45, // Standard municipal 240-litre dustbin average payload
  safetyFactor: 1.25, // 25% buffer against sudden waste spikes

  eventTypeMultipliers: {
    Marriage: 1.45,
    Festival: 1.35,
    Political: 1.30,
    Religious: 1.20,
    Community: 1.10,
    Birthday: 1.05,
    Corporate: 0.90,
    "School/College": 0.85,
    Other: 1.0,
  },

  foodMultipliers: {
    "Full Meal": 1.50,
    Both: 1.65,
    Snacks: 1.15,
    None: 0.55,
  },

  venueMultipliers: {
    "Open Ground": 1.20,
    "Road/Public Area": 1.25,
    "Community Hall": 1.0,
    "Marriage Hall": 1.05,
    "Religious Place": 1.10,
    "School/College": 0.95,
    Other: 1.0,
  },

  wasteRatiosWithFood: {
    wet: 0.55, // Food/organic scraps
    dry: 0.30, // Plates, paper, wrappers
    general: 0.15, // Non-recyclable/mixed
  },

  wasteRatiosWithoutFood: {
    wet: 0.15,
    dry: 0.60,
    general: 0.25,
  },
};

class WasteRequirementEngine {
  constructor(customConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Calculate duration multiplier
   */
  getDurationFactor(hours) {
    if (!hours || hours <= 2) return 0.75;
    if (hours <= 4) return 0.90;
    if (hours <= 8) return 1.15;
    if (hours <= 14) return 1.40;
    return 1.60;
  }

  /**
   * Run Deterministic Calculation
   */
  calculate(eventData) {
    const {
      type = "Other",
      expectedGuests = 100,
      durationHours = 4,
      venueType = "Community Hall",
      foodService = false,
      foodType = "None",
      wasteTypes = [],
    } = eventData;

    const guests = Math.max(1, Number(expectedGuests) || 100);
    const duration = Math.max(0.5, Number(durationHours) || 4);

    const eventMultiplier = this.config.eventTypeMultipliers[type] || 1.0;
    const foodMultiplier = foodService
      ? this.config.foodMultipliers[foodType] || 1.4
      : this.config.foodMultipliers["None"];
    const venueMultiplier = this.config.venueMultipliers[venueType] || 1.0;
    const durationFactor = this.getDurationFactor(duration);

    // Raw expected waste in KG
    const rawWasteKg =
      guests *
      this.config.baseWasteRateKgPerPerson *
      eventMultiplier *
      foodMultiplier *
      venueMultiplier *
      durationFactor;

    // Apply municipal safety reserve
    const estimatedWasteKg = Math.round(rawWasteKg);
    const requiredCapacityKg = estimatedWasteKg * this.config.safetyFactor;

    // Calculate Bins
    let totalBins = Math.max(
      2,
      Math.ceil(requiredCapacityKg / this.config.binCapacityKg)
    );

    const ratios = foodService
      ? this.config.wasteRatiosWithFood
      : this.config.wasteRatiosWithoutFood;

    let wetBins = Math.max(1, Math.round(totalBins * ratios.wet));
    let dryBins = Math.max(1, Math.round(totalBins * ratios.dry));
    let generalBins = Math.max(1, totalBins - (wetBins + dryBins));

    // Ensure total sum matches
    totalBins = wetBins + dryBins + generalBins;

    // Determine Waste Risk
    let wasteRisk = "LOW";
    if (guests >= 1200 || estimatedWasteKg >= 1000) {
      wasteRisk = "CRITICAL";
    } else if (guests >= 500 || estimatedWasteKg >= 400) {
      wasteRisk = "HIGH";
    } else if (guests >= 150 || estimatedWasteKg >= 120) {
      wasteRisk = "MEDIUM";
    }

    // Determine Collection Frequency
    let collectionFrequency = 1;
    if (estimatedWasteKg > 750 || duration > 10) {
      collectionFrequency = 3;
    } else if (estimatedWasteKg > 300 || duration > 6) {
      collectionFrequency = 2;
    }

    // Generate Rules-based Warnings
    const warnings = [];
    if (wasteRisk === "CRITICAL" || wasteRisk === "HIGH") {
      warnings.push("High crowd density detected. Dedicated collection vehicle recommended.");
    }
    if (foodService && (foodType === "Full Meal" || foodType === "Both")) {
      warnings.push("High organic/wet waste load. Frequent emptying of wet bins required.");
    }
    if (venueType === "Open Ground" || venueType === "Road/Public Area") {
      warnings.push("Public outdoor venue. Ensure dustbin lids and anchor points to prevent wind littering.");
    }
    if (wasteTypes.includes("Plastic")) {
      warnings.push("Plastic waste flagged. Provide segregated dry collection containers.");
    }

    return {
      estimatedWasteKg,
      requiredCapacityKg: Math.round(requiredCapacityKg),
      recommendedBins: {
        wet: wetBins,
        dry: dryBins,
        general: generalBins,
        total: totalBins,
      },
      wasteRisk,
      collectionFrequency,
      warnings,
      breakdown: {
        eventMultiplier,
        foodMultiplier,
        venueMultiplier,
        durationFactor,
        safetyFactor: this.config.safetyFactor,
      },
    };
  }
}

module.exports = new WasteRequirementEngine();
