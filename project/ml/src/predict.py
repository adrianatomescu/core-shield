from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

try:
    from .dataset import MODELS_DIR, feature_columns, load_split
except ImportError:
    from dataset import MODELS_DIR, feature_columns, load_split

DEFAULT_MODEL_PATH = MODELS_DIR / "random_forest_unswnb15.joblib"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classify one structured network event.")
    parser.add_argument("event_json", nargs="?", type=Path, help="Path to a JSON event object.")
    parser.add_argument(
        "--sample-index",
        type=int,
        help="Classify one event from the UNSW-NB15 test split instead of a JSON file.",
    )
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()
    if args.event_json is None and args.sample_index is None:
        parser.error("provide event_json or --sample-index")
    if args.event_json is not None and args.sample_index is not None:
        parser.error("event_json and --sample-index cannot be used together")
    return args


def load_event(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("The JSON event must be an object.")
    return payload


def load_sample(index: int) -> dict[str, Any]:
    frame = load_split("test")
    if not 0 <= index < len(frame):
        raise IndexError(f"Sample index must be between 0 and {len(frame) - 1}.")
    columns = feature_columns(frame)
    return frame.loc[index, columns].to_dict()


def main() -> None:
    args = parse_args()
    artifact = joblib.load(args.model)
    event = load_sample(args.sample_index) if args.sample_index is not None else load_event(args.event_json)
    columns = artifact["feature_columns"]
    event_frame = pd.DataFrame([{column: event.get(column) for column in columns}])
    probability = float(artifact["model"].predict_proba(event_frame)[0, 1])
    prediction = int(probability >= 0.5)
    result = {
        "model_version": artifact["model_version"],
        "classification": "attack" if prediction else "normal",
        "attack_probability": round(probability, 6),
        "requires_human_review": 0.4 <= probability < 0.85,
        "automation_candidate": probability >= 0.85,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
