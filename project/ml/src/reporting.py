from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, RocCurveDisplay
from sklearn.pipeline import Pipeline

MODEL_LABELS = {
    "logistic_regression": "Logistic Regression",
    "random_forest": "Random Forest",
}
MODEL_COLORS = {
    "logistic_regression": "#49a6ff",
    "random_forest": "#8d5cff",
}


def save_model_reports(
    models: dict[str, Pipeline],
    test_features: pd.DataFrame,
    test_labels: pd.Series,
    results: dict[str, Any],
    reports_dir: Path,
) -> None:
    output_dir = reports_dir / "models"
    output_dir.mkdir(parents=True, exist_ok=True)
    _save_metric_comparison(results["models"], output_dir)
    _save_confusion_matrices(models, test_features, test_labels, output_dir)
    _save_roc_curves(models, test_features, test_labels, output_dir)
    _save_random_forest_importance(models["random_forest"], output_dir)
    _write_explanation(results, output_dir)


def _save_metric_comparison(metrics: dict[str, Any], output_dir: Path) -> None:
    names = list(MODEL_LABELS)
    labels = [MODEL_LABELS[name] for name in names]
    metric_names = ("accuracy", "precision", "recall", "roc_auc")
    metric_labels = ("Accuracy", "Precision", "Recall", "ROC-AUC")
    x_positions = list(range(len(metric_names)))
    width = 0.36

    fig, axis = plt.subplots(figsize=(10, 6))
    for index, name in enumerate(names):
        values = [metrics[name][metric] for metric in metric_names]
        positions = [position + (index - 0.5) * width for position in x_positions]
        bars = axis.bar(
            positions,
            values,
            width,
            color=MODEL_COLORS[name],
            label=labels[index],
        )
        axis.bar_label(bars, labels=[f"{value:.1%}" for value in values], padding=3)
    axis.set_title("Model performance comparison")
    axis.set_ylabel("Score")
    axis.set_xticks(x_positions, metric_labels)
    axis.set_ylim(0, 1.1)
    axis.legend()
    axis.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "model_comparison.png", dpi=160)
    plt.close(fig)


def _save_confusion_matrices(
    models: dict[str, Pipeline],
    features: pd.DataFrame,
    labels: pd.Series,
    output_dir: Path,
) -> None:
    for name, model in models.items():
        fig, axis = plt.subplots(figsize=(6, 5))
        ConfusionMatrixDisplay.from_estimator(
            model,
            features,
            labels,
            display_labels=["normal", "attack"],
            cmap="Blues",
            colorbar=False,
            ax=axis,
        )
        axis.set_title(f"{MODEL_LABELS[name]} confusion matrix")
        fig.tight_layout()
        fig.savefig(output_dir / f"{name}_confusion_matrix.png", dpi=160)
        plt.close(fig)


def _save_roc_curves(
    models: dict[str, Pipeline],
    features: pd.DataFrame,
    labels: pd.Series,
    output_dir: Path,
) -> None:
    fig, axis = plt.subplots(figsize=(7, 6))
    for name, model in models.items():
        RocCurveDisplay.from_estimator(
            model,
            features,
            labels,
            name=MODEL_LABELS[name],
            color=MODEL_COLORS[name],
            ax=axis,
        )
    axis.plot([0, 1], [0, 1], linestyle="--", color="#777777", label="Random classifier")
    axis.set_title("ROC curves")
    axis.legend()
    axis.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "roc_curves.png", dpi=160)
    plt.close(fig)


def _save_random_forest_importance(model: Pipeline, output_dir: Path) -> None:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()
    importance = pd.Series(classifier.feature_importances_, index=feature_names)
    top_features = importance.nlargest(15).sort_values()

    fig, axis = plt.subplots(figsize=(10, 7))
    top_features.plot.barh(ax=axis, color="#8d5cff")
    axis.set_title("Random Forest: top 15 feature importances")
    axis.set_xlabel("Importance")
    axis.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "random_forest_feature_importance.png", dpi=160)
    plt.close(fig)


def _write_explanation(results: dict[str, Any], output_dir: Path) -> None:
    logistic = results["models"]["logistic_regression"]
    forest = results["models"]["random_forest"]
    content = f"""# CoreShield ML model report

## What was compared

- **Logistic Regression** is the baseline. It provides a simpler reference
  point for binary classification.
- **Random Forest** is the selected CoreShield model. It captures nonlinear
  relationships between network-event fields.

## Results

| Model | Accuracy | Precision | Recall | ROC-AUC | False-positive rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Logistic Regression | {logistic["accuracy"]:.2%} | {logistic["precision"]:.2%} | {logistic["recall"]:.2%} | {logistic["roc_auc"]:.2%} | {logistic["false_positive_rate"]:.2%} |
| Random Forest | {forest["accuracy"]:.2%} | {forest["precision"]:.2%} | {forest["recall"]:.2%} | {forest["roc_auc"]:.2%} | {forest["false_positive_rate"]:.2%} |

## How to read the charts

![Model comparison](model_comparison.png)

The comparison chart shows the main evaluation scores. For CoreShield, recall
is important because it measures how many real attacks were detected. Precision
also matters because low precision creates more alerts that require review.

![ROC curves](roc_curves.png)

The ROC curve shows the tradeoff between detecting attacks and generating false
positives at different thresholds. A curve closer to the top-left corner and a
higher ROC-AUC indicate better separation between normal and malicious traffic.

![Logistic Regression confusion matrix](logistic_regression_confusion_matrix.png)

![Random Forest confusion matrix](random_forest_confusion_matrix.png)

Each confusion matrix separates correct predictions from mistakes:

- **true negative**: normal traffic correctly recognized;
- **false positive**: normal traffic incorrectly raised as an attack;
- **false negative**: attack incorrectly treated as normal;
- **true positive**: attack correctly detected.

![Random Forest feature importance](random_forest_feature_importance.png)

Feature importance shows which transformed network fields influenced Random
Forest most often. It supports interpretation, but it does not prove causality.

## CoreShield decision

Random Forest is saved as the application model because it improves ROC-AUC
from {logistic["roc_auc"]:.2%} to {forest["roc_auc"]:.2%} and attack recall from
{logistic["recall"]:.2%} to {forest["recall"]:.2%}. The ML score is an input for
SOAR policy rules; it is not an automatic blocking decision by itself.
"""
    (output_dir / "REPORT.md").write_text(content, encoding="utf-8")

