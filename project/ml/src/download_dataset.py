from __future__ import annotations

import shutil
from pathlib import Path

import kagglehub

try:
    from .dataset import DATA_DIR
except ImportError:
    from dataset import DATA_DIR

DATASET_HANDLE = "dhoogla/unswnb15"


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = Path(kagglehub.dataset_download(DATASET_HANDLE))
    shutil.copytree(cache_path, DATA_DIR, dirs_exist_ok=True)
    print(f"Kaggle cache: {cache_path.resolve()}")
    print(f"UNSW-NB15 copied to: {DATA_DIR.resolve()}")


if __name__ == "__main__":
    main()
