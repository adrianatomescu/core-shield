from __future__ import annotations

import json

try:
    from .dataset import ATTACK_CATEGORY_COLUMN, TARGET_COLUMN, find_split_file, load_split
except ImportError:
    from dataset import ATTACK_CATEGORY_COLUMN, TARGET_COLUMN, find_split_file, load_split


def main() -> None:
    for split in ("train", "test"):
        frame = load_split(split)
        summary = {
            "split": split,
            "file": str(find_split_file(split)),
            "rows": len(frame),
            "columns": len(frame.columns),
            "duplicates": int(frame.duplicated().sum()),
            "missing_values": int(frame.isna().sum().sum()),
            "label_distribution": frame[TARGET_COLUMN].value_counts().sort_index().to_dict(),
        }
        if ATTACK_CATEGORY_COLUMN in frame:
            summary["attack_categories"] = (
                frame[ATTACK_CATEGORY_COLUMN].fillna("Normal").value_counts().to_dict()
            )
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

