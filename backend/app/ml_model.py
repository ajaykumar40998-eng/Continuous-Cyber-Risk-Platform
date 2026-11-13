
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report


MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "risk_classifier.joblib"

FEATURE_NAMES = [
    "likelihood",
    "impact",
    "severity_level",
    "asset_criticality",
    "exposure_level",
]

CATEGORIES = ["Low", "Medium", "High", "Critical"]


def generate_demo_dataset(n_samples=3000, random_state=42):
    """Generate synthetic demo data using a transparent scoring rule."""
    rng = np.random.default_rng(random_state)

    likelihood = rng.integers(1, 6, n_samples)
    impact = rng.integers(1, 6, n_samples)
    severity = rng.integers(1, 5, n_samples)
    criticality = rng.integers(1, 6, n_samples)
    exposure = rng.integers(1, 6, n_samples)

    score = (
        likelihood * 0.25
        + impact * 0.25
        + severity * 0.20
        + criticality * 0.15
        + exposure * 0.15
    )

    labels = np.select(
        [score < 1.8, score < 2.7, score < 3.6],
        ["Low", "Medium", "High"],
        default="Critical",
    )

    X = np.column_stack(
        [likelihood, impact, severity, criticality, exposure]
    )

    return X, labels


def train_model():
    X, y = generate_demo_dataset()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=150,
        random_state=42,
        class_weight="balanced",
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    print("Demo model evaluation:")
    print(classification_report(y_test, predictions, zero_division=0))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print(f"Model saved to: {MODEL_PATH}")
    return model


def predict_risk(
    likelihood,
    impact,
    severity_level,
    asset_criticality,
    exposure_level,
):
    values = [
        likelihood,
        impact,
        severity_level,
        asset_criticality,
        exposure_level,
    ]

    if any(not isinstance(v, (int, float)) or not 1 <= v <= 5 for v in values):
        raise ValueError("All five inputs must be numbers from 1 to 5.")

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Model not trained yet. Run ml_model.py first."
        )

    model = joblib.load(MODEL_PATH)
    prediction = model.predict([values])[0]

    probabilities = model.predict_proba([values])[0]
    confidence = float(max(probabilities))

    return {
        "predicted_category": str(prediction),
        "confidence": round(confidence, 4),
        "model_type": "RandomForestClassifier",
        "dataset_type": "synthetic_demo",
    }


if __name__ == "__main__":
    train_model()
