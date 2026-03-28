#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PORT="${PORT:-8001}"

ensure_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg found on PATH"
    return 0
  fi

  echo "ffmpeg not found. Installing prerequisite..."

  if command -v apt-get >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y ffmpeg
    else
      apt-get update && apt-get install -y ffmpeg
    fi
  elif command -v dnf >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo dnf install -y ffmpeg
    else
      dnf install -y ffmpeg
    fi
  elif command -v yum >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo yum install -y ffmpeg
    else
      yum install -y ffmpeg
    fi
  elif command -v pacman >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo pacman -S --noconfirm ffmpeg
    else
      pacman -S --noconfirm ffmpeg
    fi
  elif command -v apk >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo apk add --no-cache ffmpeg
    else
      apk add --no-cache ffmpeg
    fi
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "Could not auto-install ffmpeg. Please install ffmpeg manually and re-run this script."
    exit 1
  fi

  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg installation appears to have failed. Please install it manually and retry."
    exit 1
  fi
}

ensure_ffmpeg

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment in $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip >/dev/null
"$VENV_DIR/bin/python" -m pip install -r "$SCRIPT_DIR/requirements.txt"

cd "$REPO_ROOT"
exec "$VENV_DIR/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"
