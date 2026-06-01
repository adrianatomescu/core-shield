#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PID_FILE="$PROJECT_DIR/.frontend.pid"
FRONTEND_LOG="$PROJECT_DIR/frontend-dev.log"
FRONTEND_URL="http://127.0.0.1:5173"
BACKEND_URL="http://localhost:8000"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local retries="${2:-90}"

  for _ in $(seq 1 "$retries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

require_command docker
require_command curl
require_command npm

echo "Starting backend services with Docker..."
(cd "$PROJECT_DIR" && docker compose up -d postgres redis pgadmin)

echo "Rebuilding and starting the backend..."
(cd "$PROJECT_DIR" && docker compose up -d --build backend)

echo "Waiting for the backend to respond at $BACKEND_URL/health..."
if ! wait_for_url "$BACKEND_URL/health"; then
  echo "The backend did not start correctly. Check the logs with:"
  echo "  cd $PROJECT_DIR && docker compose logs backend"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

frontend_running=false
if [ -f "$PID_FILE" ]; then
  existing_pid="$(cat "$PID_FILE")"
  if kill -0 "$existing_pid" >/dev/null 2>&1; then
    frontend_running=true
  else
    rm -f "$PID_FILE"
  fi
fi

if [ "$frontend_running" = false ]; then
  echo "Starting the Vite frontend..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$PID_FILE"
  )
else
  echo "Frontend is already running."
fi

echo "Waiting for the frontend to respond at $FRONTEND_URL..."
if ! wait_for_url "$FRONTEND_URL"; then
  echo "The frontend did not start correctly. Check the log: $FRONTEND_LOG"
  exit 1
fi

if command -v open >/dev/null 2>&1; then
  open "$FRONTEND_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FRONTEND_URL"
else
  echo "Open manually: $FRONTEND_URL"
fi

echo "Application started."
echo "Frontend: $FRONTEND_URL"
echo "Backend API: $BACKEND_URL"
