"""
Reproducible evaluation script for RescueMesh TabPFN Priority Classifier.
Computes:
- Accuracy
- Precision (macro, weighted)
- Recall (macro, weighted)
- F1-score (macro, weighted)
- Confusion Matrix
- Category-independence verification
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from tabpfn import TabPFNClassifier

warnings.filterwarnings("ignore")

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "priority_training_data.csv")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "evaluation_report.json")

CATEGORY_MAP = {"MEDICAL": 0, "RESCUE": 1, "FOOD_WATER": 2, "SHELTER": 3}
FLOOD_RISK_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def encode_features(df: pd.DataFrame) -> np.ndarray:
    cats = df["emergency_category"].str.upper().map(CATEGORY_MAP).values
    risks = df["flood_risk_level"].str.upper().map(FLOOD_RISK_MAP).values
    nearby = df["nearby_recent_sos_count"].values
    age = df["request_age_minutes"].values
    return np.column_stack([cats, risks, nearby, age])


def run_evaluation():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    X = encode_features(df)
    y = df["priority"].values

    print(f"Loaded {len(df)} records from {DATA_PATH}")

    # Stratified train/test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")

    # Fit TabPFN
    clf = TabPFNClassifier(device="cpu", N_ensemble_configurations=2)
    clf.fit(X_train, y_train)

    # Predict on unseen test set
    y_pred = clf.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec_macro = precision_score(y_test, y_pred, average="macro")
    prec_weighted = precision_score(y_test, y_pred, average="weighted")
    rec_macro = recall_score(y_test, y_pred, average="macro")
    rec_weighted = recall_score(y_test, y_pred, average="weighted")
    f1_macro = f1_score(y_test, y_pred, average="macro")
    f1_weighted = f1_score(y_test, y_pred, average="weighted")
    cm = confusion_matrix(y_test, y_pred, labels=PRIORITY_ORDER)

    print("\n================ EVALUATION METRICS ================")
    print(f"Accuracy:           {acc:.4f} ({acc * 100:.2f}%)")
    print(f"Precision (Macro):  {prec_macro:.4f}")
    print(f"Precision (Weight): {prec_weighted:.4f}")
    print(f"Recall (Macro):     {rec_macro:.4f}")
    print(f"Recall (Weight):    {rec_weighted:.4f}")
    print(f"F1-Score (Macro):   {f1_macro:.4f}")
    print(f"F1-Score (Weight):  {f1_weighted:.4f}")
    print("\nConfusion Matrix (labels: CRITICAL, HIGH, MEDIUM, LOW):")
    print(cm)
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, labels=PRIORITY_ORDER))

    # Test category independence: same category receiving different priorities
    print("Testing Category Independence:")
    test_cases = [
        ("MEDICAL", "HIGH", 5, 30.0, "Severe Medical"),
        ("MEDICAL", "LOW", 0, 0.0, "Isolated Minor Medical"),
        ("RESCUE", "HIGH", 4, 20.0, "Severe Flood Rescue"),
        ("RESCUE", "LOW", 0, 0.0, "Minor Obstruction Rescue"),
        ("FOOD_WATER", "HIGH", 6, 50.0, "Deprived Flood Cluster Food"),
        ("FOOD_WATER", "LOW", 0, 0.0, "Initial Food Request"),
        ("SHELTER", "HIGH", 7, 50.0, "Mass Displacement Shelter"),
        ("SHELTER", "LOW", 0, 0.0, "Initial Shelter Request"),
    ]

    independence_results = []
    for cat, risk, nearby, age, desc in test_cases:
        feat = np.array([[CATEGORY_MAP[cat], FLOOD_RISK_MAP[risk], nearby, age]])
        pred = clf.predict(feat)[0]
        print(f"  {desc} ({cat}, {risk}, nb={nearby}, age={age}m) -> {pred}")
        independence_results.append({
            "description": desc,
            "category": cat,
            "flood_risk": risk,
            "nearby_sos": nearby,
            "request_age": age,
            "predicted_priority": pred,
        })

    results = {
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "model": "TabPFNClassifier(device='cpu', N_ensemble_configurations=2)",
        "random_state": 42,
        "metrics": {
            "accuracy": float(acc),
            "precision_macro": float(prec_macro),
            "precision_weighted": float(prec_weighted),
            "recall_macro": float(rec_macro),
            "recall_weighted": float(rec_weighted),
            "f1_macro": float(f1_macro),
            "f1_weighted": float(f1_weighted),
        },
        "confusion_matrix": cm.tolist(),
        "labels": PRIORITY_ORDER,
        "category_independence_test": independence_results,
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nSaved evaluation results to {REPORT_PATH}")
    return results


if __name__ == "__main__":
    run_evaluation()
