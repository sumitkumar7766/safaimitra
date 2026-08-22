#!/usr/bin/env python3
"""
evaluate.py
Loads the saved production model and evaluates performance metrics against test data,
generating models/evaluation.json and printing detailed accuracy reports.
"""

import os
import sys
import json
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.model import EventWasteModel, compute_metrics
from src.feature_engineering import get_feature_columns

MODEL_PATH = os.path.join(BASE_DIR, "models", "event_waste_model_v1.joblib")
TEST_CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "event_waste_training.csv")
EVAL_PATH = os.path.join(BASE_DIR, "models", "evaluation.json")
PRED_PATH = os.path.join(BASE_DIR, "data", "processed", "predictions.csv")


def evaluate():
    print("=========================================================")
    print("         PRODUCTION MODEL EVALUATION REPORT              ")
    print("=========================================================")

    if not os.path.exists(MODEL_PATH):
        print(f"[!] Model file not found at {MODEL_PATH}. Run scripts/train.py first.")
        sys.exit(1)

    model = EventWasteModel.load(MODEL_PATH)
    print(f"[*] Loaded Model: {model.algorithm} (Version: {model.model_version})")

    df = pd.read_csv(TEST_CSV_PATH)
    feature_cols = model.feature_names or get_feature_columns()

    X = df[feature_cols]
    y = df["total_waste_kg"].values

    preds = model.predict(X)
    metrics = compute_metrics(y, preds)

    print(f"\nOverall Dataset Performance ({len(df)} Real Events):")
    print(f"  • MAE (Mean Absolute Error): {metrics['mae']} kg")
    print(f"  • RMSE (Root Mean Squared Error): {metrics['rmse']} kg")
    print(f"  • R² Score: {metrics['r2']}")
    print(f"  • MAPE: {metrics['mape']}%")

    eval_data = {
        "modelVersion": model.model_version,
        "algorithm": model.algorithm,
        "totalSamplesEvaluated": len(df),
        "metrics": metrics,
        "featureCount": len(feature_cols),
        "features": feature_cols,
    }

    with open(EVAL_PATH, "w", encoding="utf-8") as f:
        json.dump(eval_data, f, indent=2)

    print(f"[✓] Evaluation JSON saved to: {EVAL_PATH}")
    return metrics


if __name__ == "__main__":
    evaluate()
