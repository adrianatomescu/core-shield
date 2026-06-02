from __future__ import annotations

import argparse
import json

import joblib

try:
    from .dataset import ATTACK_CATEGORY_COLUMN, MODELS_DIR, TARGET_COLUMN, load_split
except ImportError:
    from dataset import ATTACK_CATEGORY_COLUMN, MODELS_DIR, TARGET_COLUMN, load_split

DEFAULT_MODEL_PATH = MODELS_DIR / "random_forest_unswnb15.joblib"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate classified CoreShield alerts.")
    parser.add_argument("--count", type=int, default=5, choices=range(1, 101))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model", default=DEFAULT_MODEL_PATH)
    return parser.parse_args()


def policy_decision(probability: float) -> str:
    if probability >= 0.85:
        return "automation_candidate"
    if probability >= 0.4:
        return "analyst_review"
    return "monitor_only"


def main() -> None:
    args = parse_args()
    artifact = joblib.load(args.model)
    frame = load_split("test").sample(n=args.count, random_state=args.seed)
    columns = artifact["feature_columns"]
    probabilities = artifact["model"].predict_proba(frame[columns])[:, 1]

    alerts = []
    for dataset_index, (_, row), probability in zip(frame.index, frame.iterrows(), probabilities):
        alerts.append(
            {
                "dataset_index": int(dataset_index),
                "source": "unswnb15-controlled-simulator",
                "protocol": str(row["proto"]),
                "service": str(row["service"]),
                "state": str(row["state"]),
                "classification": "attack" if probability >= 0.5 else "normal",
                "attack_probability": round(float(probability), 6),
                "soar_policy_decision": policy_decision(float(probability)),
                "demo_ground_truth": "attack" if int(row[TARGET_COLUMN]) else "normal",
                "demo_attack_category": str(row[ATTACK_CATEGORY_COLUMN]),
            }
        )
    print(json.dumps(alerts, indent=2))


if __name__ == "__main__":
    main()

