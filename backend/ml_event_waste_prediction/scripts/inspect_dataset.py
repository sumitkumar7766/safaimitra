#!/usr/bin/env python3
"""
inspect_dataset.py
Inspects the raw downloaded event waste dataset, performs statistical profiling,
and generates data/processed/dataset_report.json.
"""

import os
import json
import re
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CSV_PATH = os.path.join(BASE_DIR, "data", "raw", "visva_events_raw.csv")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
REPORT_PATH = os.path.join(PROCESSED_DIR, "dataset_report.json")
os.makedirs(PROCESSED_DIR, exist_ok=True)


def parse_numeric(val):
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip().replace(",", "").replace("+", "").replace("–", "").replace("-", "")
    match = re.search(r"(\d+(?:\.\d+)?)", val_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def inspect_dataset():
    if not os.path.exists(RAW_CSV_PATH):
        print(f"[!] Raw dataset not found at {RAW_CSV_PATH}. Please run download_dataset.py first.")
        return

    df = pd.read_csv(RAW_CSV_PATH)

    print("=========================================================")
    print("           RAW EVENT WASTE DATASET INSPECTION            ")
    print("=========================================================")
    print(f"Total Rows: {len(df)}")
    print(f"Total Columns: {len(df.columns)}")
    print(f"Column Names: {list(df.columns)}")
    print("\nData Types:")
    print(df.dtypes)
    print("\nMissing Values per Column:")
    print(df.isnull().sum())

    duplicates = df.duplicated(subset=["event_name", "event_date"]).sum()
    print(f"\nDuplicate Rows by (event_name, event_date): {duplicates}")

    # Inspect numeric participant and waste values
    parsed_participants = df["participants_raw"].apply(parse_numeric).dropna()
    
    # Calculate waste values across columns
    dry_w = df["dry_waste_raw"].apply(parse_numeric).fillna(0)
    wet_w = df["wet_waste_raw"].apply(parse_numeric).fillna(0)
    mix_w = df["mix_waste_raw"].apply(parse_numeric).fillna(0)
    tot_w = df["total_waste_raw"].apply(parse_numeric).fillna(0)

    calculated_totals = []
    for i in range(len(df)):
        if tot_w[i] > 0:
            calculated_totals.append(tot_w[i])
        else:
            c = dry_w[i] + wet_w[i] + mix_w[i]
            if c > 0:
                calculated_totals.append(c)

    calc_series = pd.Series(calculated_totals)

    print("\n================== STATISTICAL SUMMARY ==================")
    if not parsed_participants.empty:
        print(f"Participants Range: {parsed_participants.min():.0f} to {parsed_participants.max():.0f}")
        print(f"Participants Mean: {parsed_participants.mean():.1f} | Median: {parsed_participants.median():.1f}")

    if not calc_series.empty:
        print(f"Total Waste Range (kg): {calc_series.min():.2f} kg to {calc_series.max():.2f} kg")
        print(f"Total Waste Mean: {calc_series.mean():.2f} kg | Median: {calc_series.median():.2f} kg")
        print(f"Total Waste Std Dev: {calc_series.std():.2f} kg")

    # Sample rows
    print("\n--- First 3 Sample Raw Records ---")
    for idx, row in df.head(3).iterrows():
        print(f"[{idx+1}] {row['event_name']} | Date: {row['event_date']} | Part: {row['participants_raw']} | Dry: {row['dry_waste_raw']} | Wet: {row['wet_waste_raw']} | Mix: {row['mix_waste_raw']} | Total: {row['total_waste_raw']}")

    # Generate Report JSON
    report = {
        "datasetName": "VISVA Sustainable Foundation Real Event Waste Dataset",
        "rawCsvPath": RAW_CSV_PATH,
        "rowCount": int(len(df)),
        "columnCount": int(len(df.columns)),
        "columns": list(df.columns),
        "dataTypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missingValues": {col: int(count) for col, count in df.isnull().sum().items()},
        "duplicateRows": int(duplicates),
        "participantStats": {
            "validCount": int(len(parsed_participants)),
            "min": float(parsed_participants.min()) if not parsed_participants.empty else 0,
            "max": float(parsed_participants.max()) if not parsed_participants.empty else 0,
            "mean": float(parsed_participants.mean()) if not parsed_participants.empty else 0,
            "median": float(parsed_participants.median()) if not parsed_participants.empty else 0,
        },
        "wasteStatsKg": {
            "validCount": int(len(calc_series)),
            "min": float(calc_series.min()) if not calc_series.empty else 0,
            "max": float(calc_series.max()) if not calc_series.empty else 0,
            "mean": float(calc_series.mean()) if not calc_series.empty else 0,
            "median": float(calc_series.median()) if not calc_series.empty else 0,
            "std": float(calc_series.std()) if not calc_series.empty else 0,
        },
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[✓] Detailed report saved to {REPORT_PATH}")
    return report


if __name__ == "__main__":
    inspect_dataset()
