"""
feature_engineering.py
Extracts ML-ready features from cleaned event records without target leakage.
"""

import numpy as np
import pandas as pd

KNOWN_EVENT_TYPES = [
    "Marathon/Sports",
    "Marriage",
    "Religious",
    "Festival",
    "Exhibition/Bazaar",
    "Corporate",
    "School/College",
    "Community",
    "Other",
]


def extract_event_type(event_name, explicit_type=None):
    """Classify event into structured categories based on domain keywords"""
    if explicit_type and explicit_type in KNOWN_EVENT_TYPES:
        return explicit_type

    name = str(event_name).lower()

    if any(k in name for k in ["marathon", "run", "walk", "cyclothon", "race", "half marathon", "sports", "10k", "5k"]):
        return "Marathon/Sports"
    if any(k in name for k in ["wedding", "marriage", "reception", "celebration", "sangeet", "engagement"]):
        return "Marriage"
    if any(k in name for k in ["annadanam", "temple", "pooja", "ahimsa", "jathara", "spiritual", "bhajan", "yatra", "prasad"]):
        return "Religious"
    if any(k in name for k in ["festival", "carnival", "utsav", "mela", "dandiya", "diwali", "holi", "fair"]):
        return "Festival"
    if any(k in name for k in ["bazaar", "market", "expo", "exhibition", "flea", "bazaar"]):
        return "Exhibition/Bazaar"
    if any(k in name for k in ["conference", "summit", "corporate", "tech", "meet", "agm", "workshop", "seminar"]):
        return "Corporate"
    if any(k in name for k in ["school", "college", "university", "campus", "fest", "annual day"]):
        return "School/College"
    if any(k in name for k in ["community", "cleanup", "drive", "awareness", "ngo"]):
        return "Community"

    return "Other"


def engineer_features(df):
    """
    Transforms dataframe into model feature matrix:
    - Target: total_waste_kg (ONLY during training)
    - Inputs: participants, log_participants, month, day_of_week, is_weekend, event_type one-hot
    - Strictly avoids target leakage (no dry/wet/mixed individual waste used as input)
    """
    df = df.copy()

    # 1. Event Type
    df["event_type"] = df.apply(
        lambda r: extract_event_type(r.get("event_name", ""), r.get("explicit_type")),
        axis=1,
    )

    # 2. Temporal Features
    if "parsed_date" in df.columns and df["parsed_date"].notnull().any():
        dates = pd.to_datetime(df["parsed_date"])
        df["month"] = dates.dt.month.fillna(6).astype(int)
        df["day_of_week"] = dates.dt.dayofweek.fillna(6).astype(int)
        df["is_weekend"] = df["day_of_week"].apply(lambda d: 1 if d in [5, 6] else 0)
        df["quarter"] = dates.dt.quarter.fillna(2).astype(int)
    else:
        df["month"] = 6
        df["day_of_week"] = 6
        df["is_weekend"] = 1
        df["quarter"] = 2

    # 3. Numeric scale features
    df["participants"] = df["participants"].astype(float)
    df["log_participants"] = np.log1p(df["participants"])

    # 4. One-hot encoding for event_type
    for et in KNOWN_EVENT_TYPES:
        df[f"type_{et}"] = (df["event_type"] == et).astype(int)

    return df


def get_feature_columns():
    """Returns the exact ordered list of input feature names required for model inference"""
    cols = [
        "participants",
        "log_participants",
        "month",
        "day_of_week",
        "is_weekend",
        "quarter",
    ]
    for et in KNOWN_EVENT_TYPES:
        cols.append(f"type_{et}")
    return cols
