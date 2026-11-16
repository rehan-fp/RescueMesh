"""
TabPFN Priority Classification Service for RescueMesh.

Wraps the genuine TabPFN (Prior-Data Fitted Network for Tabular Classification)
model pipeline, providing:
- Lazy model loading & fitting on the canonical reference dataset
- predict_priority(features): normalized output across CRITICAL, HIGH, MEDIUM, LOW
- Graceful, explicitly labeled fallback if TabPFN encounters runtime exceptions
- Thread-safe singleton interface
"""

from __future__ import annotations

import importlib.metadata as importlib_metadata
import logging
import os
import platform
import threading
import time
import warnings
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd

from ai.feature_builder import (
    CATEGORY_ENCODING,
    FLOOD_RISK_ENCODING,
    build_factors_dict,
    normalize_category,
    normalize_priority,
)

logger = logging.getLogger("rescuemesh.ai")

DATA_FILE = os.path.join(
    os.path.dirname(__file__), "..", "data", "priority_training_data.csv"
)

FALLBACK_MODEL_NAME = "Rule-based fallback (TabPFN unavailable)"


# Rule-based fallback classifier in case of model initialization failure
def _rule_based_fallback(
    category_code: str, flood_risk: str, nearby_sos: int, age_min: float
) -> str:
    category = category_code.upper()
    flood_risk = flood_risk.upper()

    if category == "MEDICAL":
        if flood_risk == "HIGH" or nearby_sos >= 4 or age_min >= 30:
            return "Critical"
        elif flood_risk == "MEDIUM" or nearby_sos >= 2 or age_min >= 15:
            return "High"
        elif nearby_sos >= 1 or age_min >= 5:
            return "High"
        else:
            return "Medium"
    elif category == "RESCUE":
        if flood_risk == "HIGH" and (nearby_sos >= 2 or age_min >= 15):
            return "Critical"
        elif flood_risk == "HIGH":
            return "High"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 or age_min >= 35:
                return "Critical"
            elif nearby_sos >= 2 or age_min >= 15:
                return "High"
            else:
                return "Medium"
        else:
            if nearby_sos >= 5 or age_min >= 45:
                return "High"
            elif nearby_sos >= 2 or age_min >= 20:
                return "Medium"
            else:
                return "Low"
    elif category == "FOOD_WATER":
        if flood_risk == "HIGH" and nearby_sos >= 5 and age_min >= 45:
            return "Critical"
        elif flood_risk == "HIGH" and (nearby_sos >= 3 or age_min >= 25):
            return "High"
        elif flood_risk == "HIGH":
            return "Medium"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 and age_min >= 35:
                return "High"
            elif nearby_sos >= 2 or age_min >= 15:
                return "Medium"
            else:
                return "Low"
        else:
            return "Low"
    else:  # SHELTER
        if flood_risk == "HIGH" and nearby_sos >= 6 and age_min >= 45:
            return "Critical"
        elif flood_risk == "HIGH" and (nearby_sos >= 3 or age_min >= 25):
            return "High"
        elif flood_risk == "HIGH":
            return "Medium"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 and age_min >= 30:
                return "High"
            elif nearby_sos >= 2 or age_min >= 15:
                return "Medium"
            else:
                return "Low"
        else:
            return "Low"


class TabPFNModelService:
    _instance: Optional[TabPFNModelService] = None
    _lock = threading.Lock()

    def __init__(self):
        self.clf = None
        self.is_loaded = False
        self.load_error = None
        self.model_name = "TabPFNClassifier(v0.1.11, N_ensemble=1)"
        self.dataset_path = DATA_FILE
        self._init_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> TabPFNModelService:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _ensure_loaded(self) -> bool:
        if self.is_loaded:
            return True
        with self._init_lock:
            if self.is_loaded:
                return True
            try:
                from tabpfn import TabPFNClassifier

                if not os.path.exists(self.dataset_path):
                    logger.error("TabPFN training data not found at %s", self.dataset_path)
                    self.load_error = f"Dataset not found at {self.dataset_path}"
                    return False

                df = pd.read_csv(self.dataset_path)
                X = np.column_stack([
                    df["emergency_category"].str.upper().map(CATEGORY_ENCODING).values,
                    df["flood_risk_level"].str.upper().map(FLOOD_RISK_ENCODING).values,
                    df["nearby_recent_sos_count"].values,
                    df["request_age_minutes"].values,
                ])
                y = df["priority"].values

                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    clf = TabPFNClassifier(device="cpu", N_ensemble_configurations=1)
                    clf.fit(X, y)
                    # Warm up prediction to precompile PyTorch computational graph
                    dummy_x = np.array([[1, 2, 0, 0.0]])
                    clf.predict(dummy_x)

                self.clf = clf
                self.is_loaded = True
                self.load_error = None
                logger.info("TabPFN model successfully fitted and warmed up on %d samples", len(df))
                return True
            except Exception as exc:
                logger.exception("Failed to initialize TabPFN: %s", exc)
                self.load_error = str(exc)
                return False

    def warm_up(self) -> bool:
        return self._ensure_loaded()

    def health_check(self) -> Dict[str, Any]:
        """Runs one controlled inference; only reports 'tabpfn' if the real model produced it."""
        started = time.perf_counter()
        priority, source, _ = self.predict("Medical", "High", nearby_sos_count=5, request_age_minutes=30.0)
        latency_ms = round((time.perf_counter() - started) * 1000, 1)

        versions: Dict[str, Optional[str]] = {}
        for package in ("tabpfn", "torch", "scikit-learn", "numpy", "pandas"):
            try:
                versions[package] = importlib_metadata.version(package)
            except importlib_metadata.PackageNotFoundError:
                versions[package] = None

        return {
            "status": "operational" if source == "tabpfn" else "degraded",
            "prediction_source": source,
            "test_prediction": priority,
            "inference_ms": latency_ms,
            "model": self.model_name,
            "model_loaded": self.is_loaded,
            "load_error": (self.load_error or "")[:200] or None,
            "python": platform.python_version(),
            "versions": versions,
            "checked_at": datetime.utcnow().isoformat() + "Z",
        }

    def predict(
        self,
        category: str,
        flood_risk: str,
        nearby_sos_count: int,
        request_age_minutes: float = 0.0,
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Predicts emergency priority.
        Returns:
            priority: 'Critical' | 'High' | 'Medium' | 'Low'
            source: 'tabpfn' | 'fallback'
            factors: Dict containing inputs, explanations, and model metadata
        """
        cat_code, cat_display = normalize_category(category)
        risk_clean = flood_risk.strip().capitalize()
        is_unknown_risk = risk_clean not in ("High", "Medium", "Low")
        # For TabPFN feature vector: TabPFN was trained on categorical encoding [0: Low, 1: Medium, 2: High].
        # When GPS fix is unavailable (flood_risk = "Unknown"), impute the neutral baseline midpoint 1 (Medium prior)
        # to ensure tabular feature vector validity without fabricating geographic certainty.
        risk_encoded_val = 1 if is_unknown_risk else FLOOD_RISK_ENCODING.get(risk_clean.upper(), 1)

        nb_count = max(0, int(nearby_sos_count))
        age_val = max(0.0, float(request_age_minutes))

        # Check if TabPFN model is available
        loaded = self._ensure_loaded()

        if loaded and self.clf is not None:
            try:
                x_input = np.array([[
                    CATEGORY_ENCODING.get(cat_code, 0),
                    risk_encoded_val,
                    nb_count,
                    age_val,
                ]])
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    raw_pred = self.clf.predict(x_input)[0]

                priority = normalize_priority(raw_pred)
                prediction_source = "tabpfn"
            except Exception as exc:
                logger.warning("TabPFN inference failed (%s), using rule fallback", exc)
                priority = _rule_based_fallback(cat_code, "Medium" if is_unknown_risk else risk_clean, nb_count, age_val)
                prediction_source = "fallback"
        else:
            logger.warning("TabPFN model unavailable (%s), using rule fallback", self.load_error)
            priority = _rule_based_fallback(cat_code, "Medium" if is_unknown_risk else risk_clean, nb_count, age_val)
            prediction_source = "fallback"

        factors = build_factors_dict(
            category_display=cat_display,
            flood_risk="Unknown" if is_unknown_risk else risk_clean,
            nearby_sos_count=nb_count,
            request_age_minutes=age_val,
            source=prediction_source,
        )
        factors["aiModel"] = self.model_name if prediction_source == "tabpfn" else FALLBACK_MODEL_NAME
        factors["predictionTimestamp"] = datetime.utcnow().isoformat() + "Z"

        return priority, prediction_source, factors


def get_model_service() -> TabPFNModelService:
    return TabPFNModelService.get_instance()
