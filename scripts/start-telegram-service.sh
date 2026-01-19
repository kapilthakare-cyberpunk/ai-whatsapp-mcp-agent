#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
SERVICE_DIR="$PROJECT_DIR/telegram_service"
ENV_FILE="$PROJECT_DIR/.env"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 first."
  exit 1
fi

if [ ! -f "$SERVICE_DIR/app.py" ]; then
  echo "telegram_service/app.py not found."
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

echo "Starting Telegram service on http://localhost:8088"
python3 -m uvicorn telegram_service.app:app --host 0.0.0.0 --port 8088
