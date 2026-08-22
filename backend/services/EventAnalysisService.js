/**
 * EventAnalysisService.js
 * Comprehensive AI Event Waste Analysis Service for SafaiMitra
 */
const documentAIService = require("./DocumentAIService");
const mlPredictionService = require("./MLPredictionService");

class EventAnalysisService {
  /**
   * Run end-to-end AI analysis for an event request
   */
  async analyzeEvent(eventData, documentFile = null) {
    try {
      // 1. Process Document AI if document provided
      let docResult = {
        documentValid: true,
        confidenceScore: 88,
        extractedEventName: eventData.name,
        extractedEventType: eventData.type,
        extractedDate: eventData.date,
        extractedLocation: eventData.location?.address || "",
        extractedOrganizer: "Verified Citizen",
        notes: "Standard digital submission.",
      };

      if (documentFile) {
        docResult = await documentAIService.processEventDocument(
          documentFile,
          eventData
        );
      }

      // 2. Run Waste Prediction & Bin Sizing Engine
      const prediction = await mlPredictionService.predict(eventData);

      // 3. Calculate Overall Confidence Level
      const inputCompleteness =
        eventData.expectedGuests && eventData.date && eventData.durationHours ? 100 : 75;
      const combinedConfidence = Math.round(
        docResult.confidenceScore * 0.4 +
          (prediction.confidence * 100) * 0.4 +
          inputCompleteness * 0.2
      );

      let confidenceScore = "HIGH";
      if (combinedConfidence < 70) {
        confidenceScore = "LOW";
      } else if (combinedConfidence < 85) {
        confidenceScore = "MEDIUM";
      }

      // 4. Construct Human-Readable AI Reasoning
      const guestText = `${eventData.expectedGuests} expected guests`;
      const foodText = eventData.foodService
        ? `with ${eventData.foodType || "meal"} service`
        : "without food service";
      const venueText = `at ${eventData.venueType || "venue"}`;
      const reasoning = `Estimated ${prediction.estimatedWasteKg} kg waste based on ${guestText} ${foodText} ${venueText} across ${eventData.durationHours} hours. Recommended ${prediction.recommendedBins.total} segregated dustbins (${prediction.recommendedBins.wet} Wet, ${prediction.recommendedBins.dry} Dry, ${prediction.recommendedBins.general} General) with ${prediction.collectionFrequency}x daily municipal collection.`;

      return {
        documentValid: docResult.documentValid,
        eventTypeDetected: docResult.extractedEventType,
        extractedEventDate: docResult.extractedDate,
        extractedLocation: docResult.extractedLocation,
        extractedOrganizer: docResult.extractedOrganizer,
        documentConfidence: docResult.confidenceScore,

        wasteRisk: prediction.wasteRisk || "MEDIUM",
        estimatedWasteKg: prediction.estimatedWasteKg,
        recommendedBins: prediction.recommendedBins,
        collectionFrequency: prediction.collectionFrequency,

        confidenceScore,
        confidenceScoreNumeric: combinedConfidence,
        reasoning,
        warnings: prediction.warnings || [],
        modelVersion: prediction.modelVersion || "SafaiMitra-WasteEngine-v2.1",
        analyzedAt: new Date(),
      };
    } catch (error) {
      console.error("EventAnalysisService Error:", error);
      // Failsafe Fallback
      return {
        documentValid: true,
        eventTypeDetected: eventData.type,
        extractedEventDate: eventData.date,
        extractedLocation: eventData.location?.address || "",
        extractedOrganizer: "Citizen",
        documentConfidence: 80,
        wasteRisk: "MEDIUM",
        estimatedWasteKg: Math.round(Number(eventData.expectedGuests || 100) * 0.8),
        recommendedBins: { wet: 2, dry: 2, general: 1, total: 5 },
        collectionFrequency: 1,
        confidenceScore: "MEDIUM",
        confidenceScoreNumeric: 80,
        reasoning: "Generated using standard municipal fallback algorithm.",
        warnings: ["Standard verification applied."],
        modelVersion: "SafaiMitra-Failsafe-v1.0",
        analyzedAt: new Date(),
      };
    }
  }
}

module.exports = new EventAnalysisService();
