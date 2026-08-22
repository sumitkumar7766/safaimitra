"""
prediction_service.py
Core prediction service that loads the serialized model, formats input features,
evaluates data coverage, predicts waste in KG, and applies the deterministic bin requirement engine.
"""

import os
import sys
import json
import math
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.model import EventWasteModel
from src.feature_engineering import extract_event_type, KNOWN_EVENT_TYPES

MODEL_PATH = os.path.join(BASE_DIR, "models", "event_waste_model_v1.joblib")
METADATA_PATH = os.path.join(BASE_DIR, "models", "model_metadata.json")

# Configurable Municipal Defaults
DEFAULT_BIN_CONFIG = {
    "bin_capacity_kg": 45.0,
    "safety_factor": 1.25,
    "ratios_with_food": {"wet": 0.55, "dry": 0.30, "general": 0.15},
    "ratios_no_food": {"wet": 0.15, "dry": 0.60, "general": 0.25},
    "min_bins": 2,
}


class PredictionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PredictionService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        self.model = None
        self.metadata = {}
        self.bin_config = DEFAULT_BIN_CONFIG

        if os.path.exists(MODEL_PATH):
            try:
                self.model = EventWasteModel.load(MODEL_PATH)
                print(f"[PredictionService] Loaded model: {self.model.algorithm} ({self.model.model_version})")
            except Exception as e:
                print(f"[PredictionService] Error loading model: {e}")

        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception:
                pass

    def prepare_features(self, event_data):
        """Extract only legitimate features supported by the model without target leakage"""
        participants = float(event_data.get("expectedGuests") or event_data.get("participants") or 100)
        event_name = str(event_data.get("name") or event_data.get("eventName") or "")
        explicit_type = event_data.get("type") or event_data.get("eventType")
        event_type = extract_event_type(event_name, explicit_type)

        # Parse date if available
        date_str = str(event_data.get("date") or event_data.get("eventDate") or "")
        month = 6
        day_of_week = 5
        is_weekend = 1
        quarter = 2

        if date_str:
            try:
                dt = pd.to_datetime(date_str)
                month = dt.month
                day_of_week = dt.dayofweek
                is_weekend = 1 if day_of_week in [5, 6] else 0
                quarter = dt.quarter
            except Exception:
                pass

        row = {
            "participants": participants,
            "log_participants": math.log1p(participants),
            "month": month,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "quarter": quarter,
        }

        # One-hot encode types
        for et in KNOWN_EVENT_TYPES:
            row[f"type_{et}"] = 1 if event_type == et else 0

        feature_cols = self.model.feature_names if self.model else list(row.keys())
        feature_df = pd.DataFrame([row])
        # Ensure all columns present
        for col in feature_cols:
            if col not in feature_df.columns:
                feature_df[col] = 0

        return feature_df[feature_cols], event_type, participants

    def calculate_bins(self, estimated_waste_kg, food_service=True):
        """Deterministic municipal bin requirement engine"""
        required_capacity = estimated_waste_kg * self.bin_config["safety_factor"]
        total_bins = max(
            self.bin_config["min_bins"],
            math.ceil(required_capacity / self.bin_config["bin_capacity_kg"]),
        )

        ratios = (
            self.bin_config["ratios_with_food"]
            if food_service
            else self.bin_config["ratios_no_food"]
        )

        wet_bins = max(1, math.ceil(total_bins * ratios["wet"]))
        dry_bins = max(1, math.ceil(total_bins * ratios["dry"]))
        general_bins = max(1, total_bins - (wet_bins + dry_bins))

        # Total adjustment
        total_bins = wet_bins + dry_bins + general_bins

        # Risk level determination
        if estimated_waste_kg >= 1000:
            risk = "CRITICAL"
        elif estimated_waste_kg >= 400:
            risk = "HIGH"
        elif estimated_waste_kg >= 150:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        # Collection frequency
        freq = 1
        if estimated_waste_kg > 750:
            freq = 3
        elif estimated_waste_kg > 300:
            freq = 2

        return {
            "wet": wet_bins,
            "dry": dry_bins,
            "general": general_bins,
            "total": total_bins,
        }, risk, freq

    def predict(self, event_data):
        """Run real ML prediction and return structured recommendation"""
        if self.model is None:
            self._init_service()

        if self.model is None:
            raise RuntimeError("ML model is not loaded. Please ensure event_waste_model_v1.joblib exists.")

        X_input, event_type, participants = self.prepare_features(event_data)
        raw_pred = self.model.predict(X_input)[0]
        estimated_waste_kg = round(float(raw_pred), 1)

        # Check data coverage against training range
        min_p = self.metadata.get("dataCoverage", {}).get("minParticipants", 100)
        max_p = self.metadata.get("dataCoverage", {}).get("maxParticipants", 48200)

        if participants < (min_p * 0.5) or participants > (max_p * 1.5):
            data_coverage = "LOW DATA COVERAGE"
        else:
            data_coverage = "GOOD"

        # Deterministic bin sizing
        food_service = event_data.get("foodService") in [True, "true", "True", 1, "1"]
        recommended_bins, risk_level, frequency = self.calculate_bins(
            estimated_waste_kg, food_service=food_service
        )

        validation_mae = self.metadata.get("metrics", {}).get("mae", 117.25)
        training_samples = self.metadata.get("totalSamples", 46)
        model_version = self.metadata.get("modelVersion", "v1.0.0")
        algorithm = self.metadata.get("algorithm", "RandomForestRegressor")

        reasoning = (
            f"Model {model_version} ({algorithm}) predicted {estimated_waste_kg} kg waste for "
            f"{int(participants)} participants ({event_type}). "
            f"Municipal engine recommends {recommended_bins['total']} segregated dustbins "
            f"({recommended_bins['wet']} Wet, {recommended_bins['dry']} Dry, {recommended_bins['general']} General) "
            f"with {frequency}x daily municipal collection."
        )

        return {
            "estimatedWasteKg": estimated_waste_kg,
            "recommendedBins": recommended_bins,
            "collectionFrequency": frequency,
            "riskLevel": risk_level,
            "dataCoverage": data_coverage,
            "modelVersion": model_version,
            "algorithm": algorithm,
            "trainingSampleCount": training_samples,
            "validationMae": validation_mae,
            "reasoning": reasoning,
            "status": "ML_PREDICTION_SUCCESS",
        }


prediction_service = PredictionService()
