#!/usr/bin/env bash
set -euo pipefail

ML_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$ML_DIR/reports"

mkdir -p "$REPORTS_DIR"
find "$REPORTS_DIR" -mindepth 1 ! -name ".gitkeep" -exec rm -rf -- {} +

echo "Deleted generated ML reports from: $REPORTS_DIR"
