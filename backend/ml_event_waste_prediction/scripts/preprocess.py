#!/usr/bin/env python3
"""
preprocess.py
Executes end-to-end data preprocessing and feature engineering on raw data
and saves the cleaned training dataset into data/processed/event_waste_training.csv.
"""

import os
import sys
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.preprocessing import clean_raw_data
from src.feature_engineering import engineer_features, get_feature_columns

RAW_CSV_PATH = os.path.join(BASE_DIR, "data", "raw", "visva_events_raw.csv")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUT_CSV_PATH = os.path.join(PROCESSED_DIR, "event_waste_training.csv")
os.makedirs(PROCESSED_DIR, exist_ok=True)


def preprocess():
    print(f"[*] Reading raw dataset from: {RAW_CSV_PATH}")
    if not os.path.exists(RAW_CSV_PATH):
        print(f"[!] Error: Raw file does not exist. Run scripts/download_dataset.py first.")
        sys.exit(1)

    raw_df = pd.read_csv(RAW_CSV_PATH)
    print(f"[*] Raw rows loaded: {len(raw_df)}")

    # 1. Clean Data
    clean_df = clean_raw_data(raw_df)
    print(f"[*] Rows after cleaning and target validation: {len(clean_df)}")

    # 2. Feature Engineering
    featured_df = engineer_features(clean_df)
    feature_cols = get_feature_columns()
    print(f"[*] Engineered {len(feature_cols)} input features: {feature_cols}")

    # 3. Save Processed CSV
    featured_df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"[✓] Saved cleaned and engineered training dataset to: {OUTPUT_CSV_PATH}")

    # Summary Statistics
    print("\n--- Processed Training Dataset Sample ---")
    print(featured_df[["event_name", "event_type", "participants", "total_waste_kg"]].head(5))

    return OUTPUT_CSV_PATH


if __name__ == "__main__":
    preprocess()
