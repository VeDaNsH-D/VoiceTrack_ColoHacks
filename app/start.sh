#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PORT="${PORT:-8001}"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment in $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip >/dev/null
"$VENV_DIR/bin/python" -m pip install -r "$SCRIPT_DIR/requirements.txt"

cd "$REPO_ROOT"
exec "$VENV_DIR/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"
