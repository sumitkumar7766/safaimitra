#!/usr/bin/env python3
"""
train.py
Trains and compares Gradient Boosting and Random Forest regression models on the real event waste dataset,
selects the best performing model, and serializes event_waste_model_v1.joblib and model_metadata.json.
"""

import os
import sys
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.feature_engineering import get_feature_columns
from src.model import EventWasteModel, compute_metrics

PROCESSED_CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "event_waste_training.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "event_waste_model_v1.joblib")
METADATA_SAVE_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
EVAL_SAVE_PATH = os.path.join(MODELS_DIR, "evaluation.json")
os.makedirs(MODELS_DIR, exist_ok=True)


def train_pipeline():
    print("=========================================================")
    print("       SAFAIMITRA EVENT WASTE MODEL TRAINING PIPELINE    ")
    print("=========================================================")

    if not os.path.exists(PROCESSED_CSV_PATH):
        print(f"[*] Running preprocess.py...")
        from scripts.preprocess import preprocess
        preprocess()

    df = pd.read_csv(PROCESSED_CSV_PATH)
    feature_cols = get_feature_columns()

    # Verify features exist
    missing_cols = [c for c in feature_cols if c not in df.columns]
    if missing_cols:
        print(f"[!] Error: Missing feature columns in dataset: {missing_cols}")
        sys.exit(1)

    X = df[feature_cols].copy()
    y = df["total_waste_kg"].values

    print(f"[*] Total real dataset size: {len(df)} samples")
    print(f"[*] Number of input features: {len(feature_cols)}")

    # 80/20 Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    print(f"[*] Training split: {len(X_train)} samples | Test split: {len(X_test)} samples")

    # 1. Train Gradient Boosting
    print("\n--- 1. Training Candidate: Gradient Boosting Regressor ---")
    gb_model = EventWasteModel(algorithm="GradientBoostingRegressor", model_version="v1.0.0")
    gb_model.train(X_train, y_train, feature_cols)
    gb_metrics, gb_preds = gb_model.evaluate(X_test, y_test)
    print(f"    Gradient Boosting -> MAE: {gb_metrics['mae']} kg | RMSE: {gb_metrics['rmse']} kg | R²: {gb_metrics['r2']} | MAPE: {gb_metrics['mape']}%")

    # 2. Train Random Forest
    print("\n--- 2. Training Candidate: Random Forest Regressor ---")
    rf_model = EventWasteModel(algorithm="RandomForestRegressor", model_version="v1.0.0")
    rf_model.train(X_train, y_train, feature_cols)
    rf_metrics, rf_preds = rf_model.evaluate(X_test, y_test)
    print(f"    Random Forest     -> MAE: {rf_metrics['mae']} kg | RMSE: {rf_metrics['rmse']} kg | R²: {rf_metrics['r2']} | MAPE: {rf_metrics['mape']}%")

    # Select Best Model based on lower MAE
    if gb_metrics["mae"] <= rf_metrics["mae"]:
        best_model = gb_model
        best_metrics = gb_metrics
        best_algo = "GradientBoostingRegressor"
        best_preds = gb_preds
    else:
        best_model = rf_model
        best_metrics = rf_metrics
        best_algo = "RandomForestRegressor"
        best_preds = rf_preds

    print(f"\n[★] Selected Production Model: {best_algo}")
    print(f"    Validation MAE: {best_metrics['mae']} kg | R²: {best_metrics['r2']}")

    # Save Production Model
    best_model.save(MODEL_SAVE_PATH)

    # Save Model Metadata
    metadata = {
        "modelVersion": "v1.0.0",
        "algorithm": best_algo,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "trainingSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "totalSamples": int(len(df)),
        "target": "total_waste_kg",
        "features": feature_cols,
        "metrics": best_metrics,
        "allModelComparisons": {
            "GradientBoostingRegressor": gb_metrics,
            "RandomForestRegressor": rf_metrics,
        },
        "dataCoverage": {
            "minParticipants": float(df["participants"].min()),
            "maxParticipants": float(df["participants"].max()),
            "minWasteKg": float(df["total_waste_kg"].min()),
            "maxWasteKg": float(df["total_waste_kg"].max()),
        },
    }

    with open(METADATA_SAVE_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[✓] Saved model metadata to {METADATA_SAVE_PATH}")

    # Generate Evaluation Artifacts
    evaluation = {
        "modelVersion": "v1.0.0",
        "algorithm": best_algo,
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "mae": best_metrics["mae"],
        "rmse": best_metrics["rmse"],
        "r2": best_metrics["r2"],
        "mape": best_metrics["mape"],
        "trainingSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "featureCount": len(feature_cols),
        "features": feature_cols,
    }

    with open(EVAL_SAVE_PATH, "w", encoding="utf-8") as f:
        json.dump(evaluation, f, indent=2)

    # Predictions comparison dataframe
    pred_df = pd.DataFrame({
        "actual_waste_kg": np.round(y_test, 2),
        "predicted_waste_kg": np.round(best_preds, 2),
        "absolute_error_kg": np.round(np.abs(y_test - best_preds), 2),
        "percentage_error": np.round(np.abs(y_test - best_preds) / np.maximum(y_test, 1e-3) * 100, 2),
    })

    predictions_path = os.path.join(BASE_DIR, "data", "processed", "predictions.csv")
    pred_df.to_csv(predictions_path, index=False)
    print(f"[✓] Saved test predictions and errors to {predictions_path}")

    return best_model, metadata


if __name__ == "__main__":
    train_pipeline()
