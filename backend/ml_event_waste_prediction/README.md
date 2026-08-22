# SafaiMitra Event Waste Machine Learning Pipeline

## Overview
This package implements a **Real-Data-Driven ML Regression Pipeline** trained on empirical event waste statistics from the **VISVA Sustainable Foundation** ([https://visva.org.in/statistics/](https://visva.org.in/statistics/)) to predict event waste generation (in kilograms) and dynamically generate segregated municipal dustbin quotas (Wet, Dry, General) through a deterministic municipal requirement engine.

---

## Folder Structure

```
backend/ml_event_waste_prediction/
├── data/
│   ├── raw/
│   │   ├── visva_events_raw.csv      # Untouched real event records
│   │   └── metadata.json             # Source origin & timestamp
│   ├── processed/
│   │   ├── dataset_report.json       # Statistical data profiling report
│   │   ├── event_waste_training.csv  # Cleaned feature-engineered dataset
│   │   └── predictions.csv           # Evaluation predictions vs actuals
│   └── README.md
├── models/
│   ├── event_waste_model_v1.joblib   # Trained production candidate model
│   ├── model_metadata.json           # Model version, features, MAE, RMSE, R²
│   └── evaluation.json               # Detailed test split metrics
├── scripts/
│   ├── download_dataset.py           # Programmatic download of real dataset
│   ├── inspect_dataset.py            # Data profiling and report generation
│   ├── preprocess.py                 # Data cleaning and feature engineering
│   ├── train.py                      # Multi-model training and selection
│   ├── evaluate.py                   # Production model validation
│   ├── predict.py                    # CLI/Subprocess prediction interface
│   └── retrain.py                    # Continuous retraining on completed events
├── src/
│   ├── feature_engineering.py        # Non-leaking feature extraction
│   ├── preprocessing.py              # Data cleaning and date parsing
│   ├── model.py                      # XGBoost & Random Forest wrapper
│   └── prediction_service.py         # Real-time prediction & bin engine
├── requirements.txt                  # Python dependencies
├── config.yaml                       # Municipal configuration
└── README.md
```

---

## Commands

### 1. Download Real Dataset
```bash
python3 scripts/download_dataset.py
```

### 2. Inspect & Profile Dataset
```bash
python3 scripts/inspect_dataset.py
```

### 3. Preprocess & Feature Engineer
```bash
python3 scripts/preprocess.py
```

### 4. Train & Select Best Model
```bash
python3 scripts/train.py
```

### 5. Evaluate Production Model
```bash
python3 scripts/evaluate.py
```

### 6. Test Real-time Prediction
```bash
python3 scripts/predict.py --participants 800 --event-type Marriage --event-name "Grand Wedding"
```

### 7. Retrain Model on Completed SafaiMitra Events
```bash
python3 scripts/retrain.py
```

---

## Integration with Node.js Backend

The Node.js backend invokes the pre-trained production model (`models/event_waste_model_v1.joblib`) via `backend/services/MLPredictionService.js`.
Predictions return:
- `estimatedWasteKg`: Predicted by the ML model.
- `recommendedBins`: Computed by the deterministic municipal requirement engine.
- `modelVersion`: Tracking version (`v1.0.0`).
- `dataCoverage`: `GOOD` or `LOW DATA COVERAGE`.
- `riskLevel`: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
