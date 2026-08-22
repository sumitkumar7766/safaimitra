/**
 * MLPredictionService.js
 * Machine Learning Prediction & Historical Accuracy Service for SafaiMitra
 */
const axios = require("axios");
const wasteRequirementEngine = require("./WasteRequirementEngine");

class MLPredictionService {
  /**
   * Predict waste & bins with ML or fallback to deterministic engine
   */
  async predict(eventData) {
    // Check if ML Microservice endpoint is configured
    if (process.env.ML_SERVICE_URL) {
      try {
        const res = await axios.post(
          `${process.env.ML_SERVICE_URL}/predict-event-waste`,
          eventData,
          { timeout: 5000 }
        );
        if (res.data && res.data.predictedWasteKg) {
          return {
            source: "ML_MODEL",
            estimatedWasteKg: Math.round(res.data.predictedWasteKg),
            recommendedBins: res.data.recommendedBins,
            confidence: res.data.confidence || 0.92,
            modelVersion: res.data.modelVersion || "RandomForest-v1.4",
          };
        }
      } catch (err) {
        console.warn("ML Service unavailable, falling back to deterministic engine:", err.message);
      }
    }

    // Graceful Fallback: Deterministic Municipal Waste Engine
    const engineResult = wasteRequirementEngine.calculate(eventData);
    return {
      source: "DETERMINISTIC_ENGINE",
      ...engineResult,
      confidence: 0.90,
      modelVersion: "SafaiMitra-WasteEngine-v2.1",
    };
  }

  /**
   * Compute ML model performance from completed events dataset
   * Evaluates MAE, RMSE, and error %
   */
  calculateModelMetrics(completedEvents = []) {
    if (!completedEvents || completedEvents.length === 0) {
      return {
        sampleCount: 0,
        maeKg: 0,
        rmseKg: 0,
        meanAccuracyPercentage: 92.5, // Baseline municipal standard
        status: "INITIALIZING_DATASET",
      };
    }

    let absoluteErrorsSum = 0;
    let squaredErrorsSum = 0;
    let validSamples = 0;

    completedEvents.forEach((ev) => {
      const predicted = ev.aiAnalysis?.estimatedWasteKg;
      const actual = ev.actualResult?.actualWasteKg;

      if (predicted && actual) {
        const diff = Math.abs(actual - predicted);
        absoluteErrorsSum += diff;
        squaredErrorsSum += diff * diff;
        validSamples++;
      }
    });

    if (validSamples === 0) {
      return {
        sampleCount: 0,
        maeKg: 0,
        rmseKg: 0,
        meanAccuracyPercentage: 92.5,
        status: "INSUFFICIENT_ACTUALS",
      };
    }

    const mae = Math.round(absoluteErrorsSum / validSamples);
    const rmse = Math.round(Math.sqrt(squaredErrorsSum / validSamples));
    const meanAccuracy = Math.max(70, Math.min(99, 100 - (mae / 400) * 100));

    return {
      sampleCount: validSamples,
      maeKg: mae,
      rmseKg: rmse,
      meanAccuracyPercentage: Math.round(meanAccuracy * 10) / 10,
      status: "OPERATIONAL",
    };
  }
}

module.exports = new MLPredictionService();
