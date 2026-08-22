"""
model.py
Model definition, training routines, and evaluation metrics for Event Waste Regression.
Supports GradientBoostingRegressor, RandomForestRegressor, and XGBoost with graceful fallback.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

# Try optional XGBoost
XGB_AVAILABLE = False
try:
    from xgboost import XGBRegressor
    XGB_AVAILABLE = True
except Exception:
    XGB_AVAILABLE = False


def compute_metrics(y_true, y_pred):
    """Calculate comprehensive regression evaluation metrics"""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    # Calculate MAPE safely without division by zero
    non_zero_mask = y_true > 0
    if np.any(non_zero_mask):
        mape = np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100
    else:
        mape = 0.0

    return {
        "mae": float(round(mae, 2)),
        "rmse": float(round(rmse, 2)),
        "r2": float(round(r2, 4)),
        "mape": float(round(mape, 2)),
    }


class EventWasteModel:
    """Wrapper class for training, evaluating and persisting event waste models"""

    def __init__(self, algorithm="GradientBoostingRegressor", model_version="v1.0.0"):
        self.algorithm = algorithm
        self.model_version = model_version
        self.model = None
        self.feature_names = []

    def build_model(self):
        if self.algorithm == "XGBoostRegressor" and XGB_AVAILABLE:
            self.model = XGBRegressor(
                n_estimators=100,
                learning_rate=0.05,
                max_depth=4,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
            )
        elif self.algorithm == "GradientBoostingRegressor" or self.algorithm == "XGBoostRegressor":
            self.algorithm = "GradientBoostingRegressor"
            self.model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.05,
                max_depth=4,
                subsample=0.85,
                random_state=42,
            )
        elif self.algorithm == "RandomForestRegressor":
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=5,
                min_samples_split=2,
                random_state=42,
                n_jobs=-1,
            )
        else:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}")
        return self.model

    def train(self, X_train, y_train, feature_names):
        self.feature_names = list(feature_names)
        self.build_model()
        self.model.fit(X_train, y_train)
        return self

    def predict(self, X):
        if self.model is None:
            raise ValueError("Model is not trained yet.")
        preds = self.model.predict(X)
        return np.clip(preds, a_min=1.0, a_max=None)

    def evaluate(self, X_test, y_test):
        preds = self.predict(X_test)
        return compute_metrics(y_test, preds), preds

    def save(self, filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        payload = {
            "model": self.model,
            "algorithm": self.algorithm,
            "model_version": self.model_version,
            "feature_names": self.feature_names,
        }
        joblib.dump(payload, filepath)
        print(f"[✓] Model saved to {filepath}")

    @classmethod
    def load(cls, filepath):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found at {filepath}")
        payload = joblib.load(filepath)
        instance = cls(
            algorithm=payload.get("algorithm", "GradientBoostingRegressor"),
            model_version=payload.get("model_version", "v1.0.0"),
        )
        instance.model = payload["model"]
        instance.feature_names = payload.get("feature_names", [])
        return instance
