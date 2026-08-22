#!/usr/bin/env python3
"""
predict.py
CLI and subprocess interface for generating predictions on event requests.
Supports both JSON payload argument and interactive CLI flags.
"""

import os
import sys
import json
import argparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.prediction_service import prediction_service


def main():
    parser = argparse.ArgumentParser(description="Predict event waste using trained model.")
    parser.add_argument("--json", type=str, help="JSON string representing the event request payload")
    parser.add_argument("--participants", type=float, default=500, help="Expected participants/guests")
    parser.add_argument("--event-type", type=str, default="Marriage", help="Type of event")
    parser.add_argument("--event-name", type=str, default="Wedding Function", help="Name of event")
    parser.add_argument("--date", type=str, default="2026-10-15", help="Event date (YYYY-MM-DD)")
    parser.add_argument("--food", action="store_true", default=True, help="Food service provided")

    args = parser.parse_args()

    if args.json:
        try:
            event_data = json.loads(args.json)
        except Exception as e:
            print(json.dumps({"error": f"Invalid JSON payload: {e}"}))
            sys.exit(1)
    else:
        event_data = {
            "expectedGuests": args.participants,
            "type": args.event_type,
            "name": args.event_name,
            "date": args.date,
            "foodService": args.food,
        }

    try:
        result = prediction_service.predict(event_data)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e), "status": "ML_PREDICTION_FAILED"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
