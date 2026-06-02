#!/usr/bin/env bash
set -euo pipefail

ML_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$ML_DIR/.venv/bin/python"
export MPLCONFIGDIR="$ML_DIR/.cache/matplotlib"
export XDG_CACHE_HOME="$ML_DIR/.cache"
mkdir -p "$MPLCONFIGDIR" "$XDG_CACHE_HOME/fontconfig"
cd "$ML_DIR"

print_help() {
  cat <<'EOF'
CoreShield ML commands

Usage:
  ./ml.sh setup                  Create the virtual environment and install dependencies
  ./ml.sh download               Download UNSW-NB15 from Kaggle
  ./ml.sh inspect                Print dataset structure and class counts
  ./ml.sh explore                Export dataset previews, summaries and charts
  ./ml.sh train                  Train both models and export evaluation charts
  ./ml.sh predict [index]        Classify one test event (default index: 0)
  ./ml.sh simulate [count]       Generate controlled random alerts (default count: 5)
  ./ml.sh all                    Download, inspect, explore and train
  ./ml.sh help                   Show this message

Generated outputs:
  reports/dataset/               Dataset preview, summary and exploratory charts
  reports/models/                Model charts and an explanatory Markdown report
  reports/training_metrics.json  Full evaluation metrics
  models/                        Saved Random Forest pipeline
EOF
}

require_venv() {
  if [[ ! -x "$VENV_PYTHON" ]]; then
    echo "Missing ML environment. Run: ./ml.sh setup" >&2
    exit 1
  fi
}

run_python() {
  require_venv
  "$VENV_PYTHON" -m "$@"
}

command="${1:-help}"
case "$command" in
  setup)
    python3 -m venv "$ML_DIR/.venv"
    "$VENV_PYTHON" -m pip install --upgrade pip
    "$VENV_PYTHON" -m pip install -r "$ML_DIR/requirements.txt"
    ;;
  download)
    run_python src.download_dataset
    ;;
  inspect)
    run_python src.inspect_dataset
    ;;
  explore)
    run_python src.explore_dataset
    ;;
  train)
    run_python src.train
    ;;
  predict)
    run_python src.predict --sample-index "${2:-0}"
    ;;
  simulate)
    run_python src.simulate_alerts --count "${2:-5}" --seed 42
    ;;
  all)
    run_python src.download_dataset
    run_python src.inspect_dataset
    run_python src.explore_dataset
    run_python src.train
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    echo "Unknown command: $command" >&2
    print_help >&2
    exit 1
    ;;
esac
