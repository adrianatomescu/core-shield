#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.frontend.pid"
FRONTEND_LOG="$PROJECT_DIR/frontend-dev.log"

frontend_stopped=false

if [ -f "$PID_FILE" ]; then
  frontend_pid="$(cat "$PID_FILE")"

  if kill -0 "$frontend_pid" >/dev/null 2>&1; then
    echo "Stopping the Vite frontend..."
    kill "$frontend_pid"
    frontend_stopped=true
  else
    echo "Frontend process is not running."
  fi

  rm -f "$PID_FILE"
else
  echo "No frontend PID file found."
fi

if [ "$frontend_stopped" = true ]; then
  sleep 1
fi

if [ -f "$FRONTEND_LOG" ]; then
  rm -f "$FRONTEND_LOG"
fi

echo "Stopping Docker services..."
(cd "$PROJECT_DIR" && docker compose stop postgres redis pgadmin backend)

echo "Application stopped."
