from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from .dataset import MODELS_DIR, REPORTS_DIR, TARGET_COLUMN, feature_columns, load_split
    from .reporting import save_model_reports
except ImportError:
    from dataset import MODELS_DIR, REPORTS_DIR, TARGET_COLUMN, feature_columns, load_split
    from reporting import save_model_reports

RANDOM_STATE = 42
MODEL_VERSION = "unswnb15-random-forest-v1"


def build_preprocessor(frame: pd.DataFrame) -> ColumnTransformer:
    numeric_columns = frame.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_columns = [column for column in frame.columns if column not in numeric_columns]

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_columns),
            ("categorical", categorical_pipeline, categorical_columns),
        ]
    )


def build_models(frame: pd.DataFrame) -> dict[str, Pipeline]:
    return {
        "logistic_regression": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(frame)),
                (
                    "classifier",
                    LogisticRegression(
                        class_weight="balanced",
                        max_iter=1000,
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(frame)),
                (
                    "classifier",
                    RandomForestClassifier(
                        class_weight="balanced",
                        max_depth=20,
                        n_estimators=200,
                        n_jobs=-1,
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
    }


def evaluate(model: Pipeline, features: pd.DataFrame, labels: pd.Series) -> dict[str, Any]:
    predictions = model.predict(features)
    probabilities = model.predict_proba(features)[:, 1]
    true_negative, false_positive, false_negative, true_positive = confusion_matrix(
        labels, predictions, labels=[0, 1]
    ).ravel()
    false_positive_rate = false_positive / (false_positive + true_negative)
    return {
        "accuracy": accuracy_score(labels, predictions),
        "precision": precision_score(labels, predictions, zero_division=0),
        "recall": recall_score(labels, predictions, zero_division=0),
        "roc_auc": roc_auc_score(labels, probabilities),
        "false_positive_rate": false_positive_rate,
        "confusion_matrix": {
            "true_negative": int(true_negative),
            "false_positive": int(false_positive),
            "false_negative": int(false_negative),
            "true_positive": int(true_positive),
        },
        "classification_report": classification_report(
            labels,
            predictions,
            labels=[0, 1],
            target_names=["normal", "attack"],
            output_dict=True,
            zero_division=0,
        ),
    }


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def clean_splits(
    train_frame: pd.DataFrame, test_frame: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, int]]:
    raw_train_rows = len(train_frame)
    raw_test_rows = len(test_frame)
    train_frame = train_frame.drop_duplicates().reset_index(drop=True)
    test_frame = test_frame.drop_duplicates().reset_index(drop=True)

    train_hashes = set(pd.util.hash_pandas_object(train_frame, index=False))
    test_hashes = pd.util.hash_pandas_object(test_frame, index=False)
    overlap_mask = test_hashes.isin(train_hashes)
    overlap_rows = int(overlap_mask.sum())
    test_frame = test_frame.loc[~overlap_mask].reset_index(drop=True)

    cleanup = {
        "raw_train_rows": raw_train_rows,
        "raw_test_rows": raw_test_rows,
        "removed_train_duplicates": raw_train_rows - len(train_frame),
        "removed_test_duplicates": raw_test_rows - len(test_frame) - overlap_rows,
        "removed_test_rows_also_present_in_train": overlap_rows,
        "clean_train_rows": len(train_frame),
        "clean_test_rows": len(test_frame),
    }
    return train_frame, test_frame, cleanup


def main() -> None:
    train_frame = load_split("train")
    test_frame = load_split("test")
    train_frame, test_frame, cleanup = clean_splits(train_frame, test_frame)
    columns = feature_columns(train_frame)
    missing_test_columns = sorted(set(columns) - set(test_frame.columns))
    if missing_test_columns:
        raise ValueError(f"Test CSV is missing columns: {missing_test_columns}")

    train_features = train_frame[columns]
    train_labels = train_frame[TARGET_COLUMN].astype(int)
    test_features = test_frame[columns]
    test_labels = test_frame[TARGET_COLUMN].astype(int)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    trained_at = datetime.now(timezone.utc).isoformat()
    results: dict[str, Any] = {
        "trained_at": trained_at,
        "dataset": "UNSW-NB15",
        "train_rows": len(train_frame),
        "test_rows": len(test_frame),
        "cleanup": cleanup,
        "feature_columns": columns,
        "models": {},
    }
    models = build_models(train_features)
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(train_features, train_labels)
        results["models"][name] = evaluate(model, test_features, test_labels)

    artifact = {
        "model": models["random_forest"],
        "model_version": MODEL_VERSION,
        "trained_at": trained_at,
        "dataset": "UNSW-NB15",
        "feature_columns": columns,
        "target_column": TARGET_COLUMN,
    }
    model_path = MODELS_DIR / "random_forest_unswnb15.joblib"
    report_path = REPORTS_DIR / "training_metrics.json"
    joblib.dump(artifact, model_path)
    write_json(report_path, results)
    save_model_reports(models, test_features, test_labels, results, REPORTS_DIR)

    print(json.dumps(results["models"], indent=2))
    print(f"Saved model: {model_path}")
    print(f"Saved report: {report_path}")
    print(f"Saved charts: {REPORTS_DIR / 'models'}")


if __name__ == "__main__":
    main()
