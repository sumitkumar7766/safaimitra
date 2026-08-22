"""
preprocessing.py
Data cleaning and validation module for SafaiMitra Event Waste Prediction.
"""

import re
import pandas as pd
import numpy as np


def parse_numeric(val):
    """Safely extract numeric float from raw string/number"""
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


def parse_event_date(date_str):
    """Parse various date formats into standard datetime object"""
    if pd.isna(date_str) or not date_str:
        return None
    date_str = str(date_str).strip()

    formats = [
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%m/%d/%Y",
        "%B %d, %Y",
        "%d %B %Y",
    ]
    for fmt in formats:
        try:
            return pd.to_datetime(date_str, format=fmt)
        except (ValueError, TypeError):
            continue

    try:
        return pd.to_datetime(date_str)
    except Exception:
        return None


def clean_raw_data(df):
    """
    Cleans raw VISVA event waste dataframe:
    - Deduplication
    - Numeric normalization
    - Total waste target calculation
    - Outlier and missing data handling
    """
    df = df.copy()

    # Drop exact duplicates
    df = df.drop_duplicates(subset=["event_name", "event_date"], keep="first")

    # Clean participants
    df["participants"] = df["participants_raw"].apply(parse_numeric)

    # Clean waste columns
    df["dry_waste_kg"] = df["dry_waste_raw"].apply(parse_numeric).fillna(0.0)
    df["wet_waste_kg"] = df["wet_waste_raw"].apply(parse_numeric).fillna(0.0)
    df["mix_waste_kg"] = df["mix_waste_raw"].apply(parse_numeric).fillna(0.0)
    df["total_waste_raw_num"] = df["total_waste_raw"].apply(parse_numeric).fillna(0.0)

    # Calculate target variable total_waste_kg
    total_waste = []
    for idx, row in df.iterrows():
        if row["total_waste_raw_num"] > 0:
            total_waste.append(row["total_waste_raw_num"])
        else:
            comp = row["dry_waste_kg"] + row["wet_waste_kg"] + row["mix_waste_kg"]
            total_waste.append(comp if comp > 0 else np.nan)

    df["total_waste_kg"] = total_waste

    # Filter only rows with valid participants and valid target total_waste_kg
    valid_mask = (df["participants"].notnull()) & (df["participants"] > 0) & (df["total_waste_kg"].notnull()) & (df["total_waste_kg"] > 0)
    clean_df = df[valid_mask].copy()

    # Parse date
    clean_df["parsed_date"] = clean_df["event_date"].apply(parse_event_date)

    return clean_df.reset_index(drop=True)
