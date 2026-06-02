from __future__ import annotations

import json
from typing import Any

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd

try:
    from .dataset import ATTACK_CATEGORY_COLUMN, REPORTS_DIR, TARGET_COLUMN, load_split
except ImportError:
    from dataset import ATTACK_CATEGORY_COLUMN, REPORTS_DIR, TARGET_COLUMN, load_split


def write_json(path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def save_label_distribution(frame: pd.DataFrame, output_dir) -> None:
    counts = frame[TARGET_COLUMN].map({0: "normal", 1: "attack"}).value_counts()
    fig, axis = plt.subplots(figsize=(7, 5))
    bars = axis.bar(counts.index, counts.values, color=["#49a6ff", "#8d5cff"])
    axis.bar_label(bars, labels=[f"{value:,}" for value in counts.values], padding=3)
    axis.set_title("UNSW-NB15 training split: binary labels")
    axis.set_ylabel("Number of events")
    axis.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "label_distribution.png", dpi=160)
    plt.close(fig)


def save_attack_categories(frame: pd.DataFrame, output_dir) -> None:
    counts = frame[ATTACK_CATEGORY_COLUMN].fillna("Normal").value_counts().sort_values()
    fig, axis = plt.subplots(figsize=(10, 6))
    counts.plot.barh(ax=axis, color="#8d5cff")
    axis.set_title("UNSW-NB15 training split: attack categories")
    axis.set_xlabel("Number of events")
    axis.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "attack_categories.png", dpi=160)
    plt.close(fig)


def save_numeric_correlations(frame: pd.DataFrame, output_dir) -> None:
    numeric = frame.select_dtypes(include=["number", "bool"])
    correlations = (
        numeric.corr()[TARGET_COLUMN]
        .drop(TARGET_COLUMN)
        .abs()
        .nlargest(15)
        .sort_values()
    )
    fig, axis = plt.subplots(figsize=(10, 7))
    correlations.plot.barh(ax=axis, color="#49a6ff")
    axis.set_title("Top numeric correlations with the binary label")
    axis.set_xlabel("Absolute Pearson correlation")
    axis.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_dir / "numeric_correlations.png", dpi=160)
    plt.close(fig)


def write_explanation(output_dir, summary: dict[str, Any]) -> None:
    content = f"""# UNSW-NB15 dataset report

## Dataset overview

| Split | Rows | Columns | Duplicate rows | Missing values |
| --- | ---: | ---: | ---: | ---: |
| Training | {summary["train"]["rows"]:,} | {summary["train"]["columns"]} | {summary["train"]["duplicates"]:,} | {summary["train"]["missing_values"]:,} |
| Testing | {summary["test"]["rows"]:,} | {summary["test"]["columns"]} | {summary["test"]["duplicates"]:,} | {summary["test"]["missing_values"]:,} |

The dataset contains structured network-flow events. Each row represents one
observed event, while the `label` field identifies normal traffic (`0`) or an
attack (`1`). The `attack_cat` field describes the known attack family and is
used only for exploration, not as a training feature.

## Binary labels

![Binary-label distribution](label_distribution.png)

This chart shows whether normal and malicious events are balanced. The training
pipeline uses class balancing because the two classes do not contain the same
number of rows.

## Attack categories

![Attack categories](attack_categories.png)

This chart shows the types of attack present in UNSW-NB15, such as Generic,
Exploits, Fuzzers and DoS. CoreShield currently performs binary classification:
normal traffic versus attack traffic.

## Numeric correlations

![Numeric correlations](numeric_correlations.png)

This chart shows the strongest absolute Pearson correlations between numeric
event fields and the binary label. It is useful for initial exploration, but a
correlation does not prove causality and does not capture all nonlinear
relationships learned by Random Forest.

## Inspect individual rows

Open `training_preview.csv` and `testing_preview.csv` to inspect the first 30
events from each split in a spreadsheet-like view.
"""
    (output_dir / "REPORT.md").write_text(content, encoding="utf-8")


def main() -> None:
    train_frame = load_split("train")
    test_frame = load_split("test")
    output_dir = REPORTS_DIR / "dataset"
    output_dir.mkdir(parents=True, exist_ok=True)

    train_frame.head(30).to_csv(output_dir / "training_preview.csv", index=False)
    test_frame.head(30).to_csv(output_dir / "testing_preview.csv", index=False)
    summary = {
        "train": {
            "rows": len(train_frame),
            "columns": len(train_frame.columns),
            "duplicates": int(train_frame.duplicated().sum()),
            "missing_values": int(train_frame.isna().sum().sum()),
        },
        "test": {
            "rows": len(test_frame),
            "columns": len(test_frame.columns),
            "duplicates": int(test_frame.duplicated().sum()),
            "missing_values": int(test_frame.isna().sum().sum()),
        },
        "columns": [
            {"name": column, "dtype": str(dtype)}
            for column, dtype in train_frame.dtypes.items()
        ],
    }
    write_json(output_dir / "dataset_summary.json", summary)
    save_label_distribution(train_frame, output_dir)
    save_attack_categories(train_frame, output_dir)
    save_numeric_correlations(train_frame, output_dir)
    write_explanation(output_dir, summary)

    print(f"Dataset report saved to: {output_dir}")
    print(f"Open preview: {output_dir / 'training_preview.csv'}")


if __name__ == "__main__":
    main()
