#!/bin/bash

set -e

SERVICE_URL="${TELEGRAM_SERVICE_URL:-http://localhost:8088}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found. Install curl first."
  exit 1
fi

read -r -p "Telegram phone (e.g. +1234567890): " PHONE
if [ -z "$PHONE" ]; then
  echo "Phone is required."
  exit 1
fi

echo "Requesting login code..."
curl -s -X POST "${SERVICE_URL}/login/start" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\"}" >/dev/null

read -r -p "Enter the code you received: " CODE
if [ -z "$CODE" ]; then
  echo "Code is required."
  exit 1
fi

read -r -p "2FA password (leave empty if none): " PASSWORD

if [ -n "$PASSWORD" ]; then
  curl -s -X POST "${SERVICE_URL}/login/confirm" \
    -H 'Content-Type: application/json' \
    -d "{\"phone\":\"${PHONE}\",\"code\":\"${CODE}\",\"password\":\"${PASSWORD}\"}"
else
  curl -s -X POST "${SERVICE_URL}/login/confirm" \
    -H 'Content-Type: application/json' \
    -d "{\"phone\":\"${PHONE}\",\"code\":\"${CODE}\"}"
fi

echo ""
echo "Login complete."
