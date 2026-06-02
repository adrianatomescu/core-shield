#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

expected_origin="https://github.com/adrianatomescu/core-shield"
branch="$(git branch --show-current)"

if [[ -z "$branch" ]]; then
  echo "Push cancelled: Git is not currently on a named branch."
  exit 1
fi

if ! origin_url="$(git remote get-url origin 2>/dev/null)"; then
  echo "Push cancelled: the Git remote 'origin' is not configured."
  exit 1
fi

if [[ "$origin_url" != "$expected_origin" && "$origin_url" != "$expected_origin.git" ]]; then
  echo "Push cancelled: origin points to '$origin_url'."
  echo "Expected: '$expected_origin'."
  exit 1
fi

message="${*:-}"

if [[ -z "$message" ]]; then
  read -r -p "Commit message: " message
fi

if [[ -z "$message" ]]; then
  echo "Push cancelled: the commit message cannot be empty."
  exit 1
fi

# Keep editor settings, SQL sessions and local runtime files out of commits.
git add -- \
  git.sh \
  project/backend \
  project/frontend \
  project/ml \
  project/docker-compose.yml \
  project/start.sh \
  project/stop.sh

if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

echo
echo "Changes prepared for commit to $expected_origin:"
git diff --cached --stat
echo

read -r -p "Commit and push to origin/$branch? [y/N] " answer

case "$answer" in
  y|Y|yes|YES)
    git commit -m "$message"
    git push -u origin "$branch"
    ;;
  *)
    echo "Push cancelled. The selected changes remain staged."
    ;;
esac
