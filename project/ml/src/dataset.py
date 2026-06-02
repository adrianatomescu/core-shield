from __future__ import annotations

from pathlib import Path

import pandas as pd

ML_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ML_DIR / "data" / "unswnb15"
MODELS_DIR = ML_DIR / "models"
REPORTS_DIR = ML_DIR / "reports"

TARGET_COLUMN = "label"
ATTACK_CATEGORY_COLUMN = "attack_cat"
IGNORED_COLUMNS = {"id", TARGET_COLUMN, ATTACK_CATEGORY_COLUMN}


def find_split_file(split: str) -> Path:
    """Find one UNSW-NB15 split without depending on exact file casing."""
    candidates = sorted(
        path
        for pattern in ("*.csv", "*.parquet")
        for path in DATA_DIR.rglob(pattern)
    )
    split_tokens = {
        "train": ("training", "train"),
        "test": ("testing", "test"),
    }
    if split not in split_tokens:
        raise ValueError(f"Unsupported split: {split}")

    for token in split_tokens[split]:
        for candidate in candidates:
            if token in candidate.name.lower():
                return candidate

    available = "\n".join(f"- {path.relative_to(DATA_DIR)}" for path in candidates)
    raise FileNotFoundError(
        f"Could not find the {split!r} dataset file in {DATA_DIR}.\n"
        f"Available CSV or Parquet files:\n{available or '- none'}"
    )


def load_split(split: str) -> pd.DataFrame:
    path = find_split_file(split)
    frame = pd.read_parquet(path) if path.suffix == ".parquet" else pd.read_csv(path)
    frame.columns = [column.strip() for column in frame.columns]
    if TARGET_COLUMN not in frame.columns:
        raise ValueError(f"{path.name} does not contain the {TARGET_COLUMN!r} column")
    return frame


def feature_columns(frame: pd.DataFrame) -> list[str]:
    return [column for column in frame.columns if column not in IGNORED_COLUMNS]
