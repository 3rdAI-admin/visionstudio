#!/usr/bin/env bash
# start/stop/restart the visionedit frontend + backend
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.run"
mkdir -p "$LOG_DIR"

BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
PORTS_FILE="$LOG_DIR/ports.env"

FRONTEND_PORT=3002
BACKEND_PORT=3001

# Settings UI writes FRONTEND_PORT/BACKEND_PORT here to override the defaults
# above on the next restart.
if [[ -f "$PORTS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$PORTS_FILE"
fi

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

stop_one() {
  local name="$1" pid_file="$2"

  if is_running "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    echo "Stopping $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  else
    echo "$name not running (per pid file)"
  fi
  rm -f "$pid_file"
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "Backend already running (pid $(cat "$BACKEND_PID_FILE"))"
    return
  fi
  if [[ ! -f "$ROOT/backend/.env" ]]; then
    echo "Warning: backend/.env not found — GOOGLE_API_KEY will be missing." >&2
  fi
  echo "Starting backend on :$BACKEND_PORT..."
  nohup env -C "$ROOT/backend" \
    PORT="$BACKEND_PORT" \
    FRONTEND_ORIGIN="http://localhost:$FRONTEND_PORT" \
    node index.js > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    echo "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
    return
  fi
  echo "Starting frontend on :$FRONTEND_PORT..."
  nohup env -C "$ROOT" "$ROOT/node_modules/.bin/vite" --port="$FRONTEND_PORT" --host=0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
}

status() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "Backend:  running (pid $(cat "$BACKEND_PID_FILE"), http://localhost:$BACKEND_PORT)"
  else
    echo "Backend:  stopped"
  fi
  if is_running "$FRONTEND_PID_FILE"; then
    echo "Frontend: running (pid $(cat "$FRONTEND_PID_FILE"), http://localhost:$FRONTEND_PORT)"
  else
    echo "Frontend: stopped"
  fi
}

case "${1:-}" in
  start)
    start_backend
    start_frontend
    sleep 1
    status
    ;;
  stop)
    stop_one "frontend" "$FRONTEND_PID_FILE"
    stop_one "backend" "$BACKEND_PID_FILE"
    ;;
  restart)
    stop_one "frontend" "$FRONTEND_PID_FILE"
    stop_one "backend" "$BACKEND_PID_FILE"
    start_backend
    start_frontend
    sleep 1
    status
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
