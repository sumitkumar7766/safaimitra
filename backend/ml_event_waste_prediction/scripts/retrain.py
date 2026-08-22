#!/usr/bin/env python3
"""
retrain.py
Continuous learning script that incorporates real completed SafaiMitra event records with actual
recorded waste metrics, trains a new candidate model version, compares validation metrics against
the production model, and promotes the new version ONLY if validation MAE improves.
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

from src.feature_engineering import get_feature_columns, engineer_features
from src.model import EventWasteModel, compute_metrics

TRAINING_CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "event_waste_training.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
CURRENT_MODEL_PATH = os.path.join(MODELS_DIR, "event_waste_model_v1.joblib")
CURRENT_METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")


def retrain_pipeline(new_events_df=None):
    print("=========================================================")
    print("        SAFAIMITRA CONTINUOUS MODEL RETRAINING           ")
    print("=========================================================")

    if not os.path.exists(TRAINING_CSV_PATH):
        print(f"[!] Base training dataset not found at {TRAINING_CSV_PATH}.")
        sys.exit(1)

    base_df = pd.read_csv(TRAINING_CSV_PATH)
    print(f"[*] Base training records count: {len(base_df)}")

    # Merge new real completed SafaiMitra records if provided
    if new_events_df is not None and not new_events_df.empty:
        print(f"[*] Incorporating {len(new_events_df)} newly completed SafaiMitra events...")
        featured_new = engineer_features(new_events_df)
        combined_df = pd.concat([base_df, featured_new], ignore_index=True)
        combined_df = combined_df.drop_duplicates(subset=["event_name", "event_date"], keep="last")
    else:
        combined_df = base_df

    feature_cols = get_feature_columns()
    X = combined_df[feature_cols]
    y = combined_df["total_waste_kg"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    # Determine new version number
    current_version = "v1.0.0"
    current_mae = 999.0
    if os.path.exists(CURRENT_METADATA_PATH):
        try:
            with open(CURRENT_METADATA_PATH, "r") as f:
                meta = json.load(f)
                current_version = meta.get("modelVersion", "v1.0.0")
                current_mae = meta.get("metrics", {}).get("mae", 999.0)
        except Exception:
            pass

    # Increment minor version
    v_parts = current_version.replace("v", "").split(".")
    next_minor = int(v_parts[1]) + 1 if len(v_parts) > 1 else 1
    new_version = f"v{v_parts[0]}.{next_minor}.0"

    print(f"[*] Training candidate model: {new_version} on {len(X_train)} samples...")

    candidate_model = EventWasteModel(algorithm="RandomForestRegressor", model_version=new_version)
    candidate_model.train(X_train, y_train, feature_cols)
    candidate_metrics, _ = candidate_model.evaluate(X_test, y_test)

    print(f"[*] Current Production Model ({current_version}) MAE: {current_mae} kg")
    print(f"[*] New Candidate Model   ({new_version}) MAE: {candidate_metrics['mae']} kg | R²: {candidate_metrics['r2']}")

    # Verification: Only promote if MAE is equal or better
    if candidate_metrics["mae"] <= current_mae:
        print(f"\n[✓] Performance validated! Promoting {new_version} to Production.")
        candidate_model.save(CURRENT_MODEL_PATH)

        updated_metadata = {
            "modelVersion": new_version,
            "previousVersion": current_version,
            "algorithm": candidate_model.algorithm,
            "retrainedAt": datetime.now(timezone.utc).isoformat(),
            "trainingSamples": int(len(X_train)),
            "testSamples": int(len(X_test)),
            "totalSamples": int(len(combined_df)),
            "target": "total_waste_kg",
            "features": feature_cols,
            "metrics": candidate_metrics,
            "dataCoverage": {
                "minParticipants": float(combined_df["participants"].min()),
                "maxParticipants": float(combined_df["participants"].max()),
                "minWasteKg": float(combined_df["total_waste_kg"].min()),
                "maxWasteKg": float(combined_df["total_waste_kg"].max()),
            },
        }

        with open(CURRENT_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(updated_metadata, f, indent=2)

        # Save updated training dataset
        combined_df.to_csv(TRAINING_CSV_PATH, index=False)
        print(f"[✓] Updated training dataset and metadata saved successfully.")
    else:
        print(f"\n[!] Candidate model did NOT outperform production model. Keeping {current_version} in production.")


if __name__ == "__main__":
    retrain_pipeline()
