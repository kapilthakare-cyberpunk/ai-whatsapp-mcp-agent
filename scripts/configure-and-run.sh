#!/bin/bash

# Interactive setup and launch for WhatsApp MCP Agent

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/whatsapp-agent.pid"
CF_LOG="$LOG_DIR/cloudflared.log"
SERVER_LOG="$LOG_DIR/server.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
MCP_LOG="$LOG_DIR/mcp-server.log"

mkdir -p "$LOG_DIR"

is_tty() {
  [ -t 0 ] || [ -t 1 ]
}

extract_cloudflared_url() {
  local log_file="$1"
  if command -v rg >/dev/null 2>&1; then
    rg -o "https://[a-z0-9-]+\\.trycloudflare\\.com" "$log_file" | tail -n 1
  else
    grep -Eo "https://[a-z0-9-]+\\.trycloudflare\\.com" "$log_file" | tail -n 1
  fi
}

strip_quotes() {
  local value="$1"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  echo "$value"
}

extract_env_value() {
  local key="$1"
  local file="$2"
  local line=""
  if [ ! -f "$file" ]; then
    echo ""
    return 0
  fi
  if command -v rg >/dev/null 2>&1; then
    line=$(rg -m 1 "^${key}=" "$file" 2>/dev/null || true)
  else
    line=$(grep -m 1 -E "^${key}=" "$file" 2>/dev/null || true)
  fi
  line="${line#${key}=}"
  strip_quotes "$line"
}

extract_port_from_url() {
  local url="$1"
  if [[ "$url" =~ :([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ""
  fi
}

extract_config_value() {
  local key="$1"
  local file="$2"
  if command -v rg >/dev/null 2>&1; then
    rg -o "${key}:\\s*([^\\s]+)" -r '$1' "$file" 2>/dev/null | head -n 1
  else
    grep -E "${key}:" "$file" 2>/dev/null | head -n 1 | sed -E "s/^${key}:\\s*([^\\s]+).*/\\1/"
  fi
}

ensure_node_modules() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    (cd "$dir" && npm install)
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local tries="${3:-30}"
  for i in $(seq 1 "$tries"); do
    if curl -s "$url" >/dev/null 2>&1; then
      echo "$label is ready."
      return 0
    fi
    sleep 1
  done
  echo "$label failed to start. Check logs."
  return 1
}

is_connected() {
  curl -s "http://localhost:$APP_PORT/status" 2>/dev/null | grep -q '"status":"connected"'
}

print_qr_from_api() {
  local response="$1"
  (cd "$PROJECT_DIR" && printf '%s' "$response" | node -e "\
const fs = require('fs');\
const input = fs.readFileSync(0, 'utf8');\
let data;\
try { data = JSON.parse(input); } catch { process.exit(1); }\
const qr = data.qr || '';\
if (!qr) process.exit(2);\
const qrcode = require('qrcode-terminal');\
console.log('');\
console.log('Scan this QR code with your WhatsApp:');\
console.log('-----------------------------------');\
qrcode.generate(qr, { small: true });\
console.log('-----------------------------------');\
")
}

wait_for_connection() {
  local timeout="${1:-120}"
  local elapsed=0
  local qr_printed=false

  if is_connected; then
    echo "WhatsApp already connected."
    return 0
  fi

  echo "Waiting for WhatsApp login..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if is_connected; then
      echo "WhatsApp connected."
      return 0
    fi

    if [ "$qr_printed" = false ]; then
      local response
      response=$(curl -s "http://localhost:$APP_PORT/qr" || true)
      if print_qr_from_api "$response"; then
        qr_printed=true
        echo "Scan the QR code above to continue."
      fi
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Timed out waiting for WhatsApp login. You can scan the QR later via /qr."
  return 1
}

prompt_value() {
  local label="$1"
  local default="$2"
  local env_name="$3"
  local secret="${4:-false}"
  local input=""
  local tty_in="/dev/tty"
  local prompt_out="/dev/stderr"
  local use_tty=false

  if [ -n "$env_name" ] && [ -n "${!env_name}" ]; then
    echo "${!env_name}"
    return 0
  fi

  if ! is_tty && [ -r "$tty_in" ]; then
    use_tty=true
  fi
  if [ -w "$tty_in" ]; then
    prompt_out="$tty_in"
  fi

  if [ "$secret" = "true" ]; then
    printf "%s [%s]: " "$label" "$default" > "$prompt_out"
    if [ "$use_tty" = true ]; then
      read -r -s input < "$tty_in"
    else
      read -r -s input
    fi
    printf "\n" > "$prompt_out"
  else
    printf "%s [%s]: " "$label" "$default" > "$prompt_out"
    if [ "$use_tty" = true ]; then
      read -r input < "$tty_in"
    else
      read -r input
    fi
  fi

  if [ -z "$input" ]; then
    input="$default"
  fi

  echo "$input"
}

prompt_yes_no() {
  local label="$1"
  local default="$2"
  local env_name="$3"
  local value

  value="$(prompt_value "$label" "$default" "$env_name")"
  if [[ "$value" =~ ^[Yy]$ ]]; then
    echo "Y"
  else
    echo "N"
  fi
}

is_port_listening() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" | grep -q ":$port"
    return $?
  fi

  return 1
}

stop_pid_file() {
  if [ -f "$PID_FILE" ]; then
    while read -r pid; do
      if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
        kill "$pid" >/dev/null 2>&1 || true
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
}

full_wipe() {
  stop_pid_file
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti:3005 -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$pids" ]; then kill $pids; fi
    pids=$(lsof -ti:3006 -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$pids" ]; then kill $pids; fi
  fi
  rm -rf "$PROJECT_DIR/baileys_store_multi" "$PROJECT_DIR/whatsapp_data.db"
}

start_cloudflared_quick() {
  rm -f "$CF_LOG"
  nohup cloudflared tunnel --url "http://localhost:$MCP_PORT" > "$CF_LOG" 2>&1 &
  for i in {1..10}; do
    url=$(extract_cloudflared_url "$CF_LOG")
    if [ -n "$url" ]; then
      echo "Cloudflared URL: ${url}/sse"
      return 0
    fi
    sleep 1
  done
  echo "Cloudflared started. Check logs at $CF_LOG for the public URL."
}

start_cloudflared_named() {
  rm -f "$CF_LOG"
  local tunnel_name
  tunnel_name=$(extract_config_value "tunnel" "$HOME/.cloudflared/config.yml")
  local hostname
  hostname=$(extract_config_value "hostname" "$HOME/.cloudflared/config.yml")
  if [ -z "$tunnel_name" ]; then
    echo "No tunnel name found in ~/.cloudflared/config.yml"
    return 1
  fi
  nohup cloudflared tunnel run "$tunnel_name" > "$CF_LOG" 2>&1 &
  if [ -n "$hostname" ]; then
    echo "Cloudflared URL: https://${hostname}/sse"
  else
    echo "Cloudflared started. Check logs at $CF_LOG for hostname."
  fi
}

echo "WhatsApp MCP Agent setup"
echo "------------------------"

APP_PORT_FILE="$(extract_env_value "PORT" "$PROJECT_DIR/.env")"
MCP_PORT_FILE="$(extract_env_value "PORT" "$PROJECT_DIR/mcp-server/.env")"
FRONTEND_URL_FILE="$(extract_env_value "VITE_API_URL" "$PROJECT_DIR/frontend/.env")"
FRONTEND_PORT_FILE="$(extract_port_from_url "$FRONTEND_URL_FILE")"

APP_PORT="${APP_PORT:-${APP_PORT_FILE:-3005}}"
MCP_PORT="${MCP_PORT:-${MCP_PORT_FILE:-3006}}"
FRONTEND_PORT="${FRONTEND_PORT:-${FRONTEND_PORT_FILE:-5173}}"

FORCE_CONFIG="${FORCE_CONFIG:-N}"
USE_EXISTING_CONFIG=false
if [ -f "$PROJECT_DIR/.env" ] && [[ ! "$FORCE_CONFIG" =~ ^[Yy]$ ]]; then
  USE_EXISTING_CONFIG=true
fi

WIPE_CONFIRM="$(prompt_yes_no "Full wipe (logout + delete database)? (y/N)" "N" "WIPE_CONFIRM")"

if [ "$USE_EXISTING_CONFIG" = true ]; then
  echo "Using existing .env files."
  GEMINI_API_KEY="${GEMINI_API_KEY:-$(extract_env_value "GEMINI_API_KEY" "$PROJECT_DIR/.env")}"
  GROQ_API_KEY="${GROQ_API_KEY:-$(extract_env_value "GROQ_API_KEY" "$PROJECT_DIR/.env")}"
  OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-$(extract_env_value "OLLAMA_BASE_URL" "$PROJECT_DIR/.env")}"
  OLLAMA_MODEL="${OLLAMA_MODEL:-$(extract_env_value "OLLAMA_MODEL" "$PROJECT_DIR/.env")}"
  TODOIST_API_KEY="${TODOIST_API_KEY:-$(extract_env_value "TODOIST_API_KEY" "$PROJECT_DIR/.env")}"
  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(extract_env_value "TELEGRAM_BOT_TOKEN" "$PROJECT_DIR/.env")}"
else
  GEMINI_API_KEY="$(prompt_value "Gemini API key (recommended)" "" "GEMINI_API_KEY" true)"
  GROQ_API_KEY="$(prompt_value "Groq API key (fallback)" "" "GROQ_API_KEY" true)"
  OLLAMA_BASE_URL="$(prompt_value "Ollama base URL" "http://localhost:11434" "OLLAMA_BASE_URL")"
  OLLAMA_MODEL="$(prompt_value "Ollama model" "llama3.2" "OLLAMA_MODEL")"
  TODOIST_API_KEY="$(prompt_value "Todoist API key (optional)" "" "TODOIST_API_KEY" true)"
  TELEGRAM_BOT_TOKEN="$(prompt_value "Telegram bot token (optional)" "" "TELEGRAM_BOT_TOKEN" true)"
fi

if [[ "$WIPE_CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Performing full wipe..."
  full_wipe
fi

WRITE_ROOT_ENV=true
if [ -f "$PROJECT_DIR/.env" ] && [[ ! "$FORCE_CONFIG" =~ ^[Yy]$ ]]; then
  WRITE_ROOT_ENV=false
fi

WRITE_MCP_ENV=true
if [ -f "$PROJECT_DIR/mcp-server/.env" ] && [[ ! "$FORCE_CONFIG" =~ ^[Yy]$ ]]; then
  WRITE_MCP_ENV=false
fi

WRITE_FRONTEND_ENV=true
if [ -f "$PROJECT_DIR/frontend/.env" ] && [[ ! "$FORCE_CONFIG" =~ ^[Yy]$ ]]; then
  WRITE_FRONTEND_ENV=false
fi

if [ "$WRITE_ROOT_ENV" = true ]; then
  cat <<EOF > "$PROJECT_DIR/.env"
# WhatsApp Business Account Configuration (Legacy/Official API)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=whatsapp_verify_token
WHATSAPP_WEBHOOK_SECRET=

# AI Configuration
GEMINI_API_KEY=$GEMINI_API_KEY
GROQ_API_KEY=$GROQ_API_KEY
MIXTRAL_API_KEY=
OLLAMA_BASE_URL=$OLLAMA_BASE_URL
OLLAMA_MODEL=$OLLAMA_MODEL

# Task Management: Todoist Integration
TODOIST_API_KEY=$TODOIST_API_KEY

# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

# Backfill
AUTO_BACKFILL_ON_STARTUP=true

# Server Configuration
PORT=$APP_PORT

# MCP Broker Configuration (optional)
MCP_BROKER_URL=http://localhost:8080
MCP_TOPIC=whatsapp_messages
EOF
fi

if [ "$WRITE_MCP_ENV" = true ]; then
  cat <<EOF > "$PROJECT_DIR/mcp-server/.env"
WHATSAPP_API_URL=http://localhost:$APP_PORT
TRANSPORT=sse
PORT=$MCP_PORT
EOF
fi

if [ "$WRITE_FRONTEND_ENV" = true ]; then
  cat <<EOF > "$PROJECT_DIR/frontend/.env"
VITE_API_URL=http://localhost:$APP_PORT
EOF
fi

echo ""
echo "Config status:"
if [ "$WRITE_ROOT_ENV" = true ]; then
  echo "  - wrote $PROJECT_DIR/.env"
else
  echo "  - kept $PROJECT_DIR/.env"
fi
if [ "$WRITE_MCP_ENV" = true ]; then
  echo "  - wrote $PROJECT_DIR/mcp-server/.env"
else
  echo "  - kept $PROJECT_DIR/mcp-server/.env"
fi
if [ "$WRITE_FRONTEND_ENV" = true ]; then
  echo "  - wrote $PROJECT_DIR/frontend/.env"
else
  echo "  - kept $PROJECT_DIR/frontend/.env"
fi
echo ""

echo "Starting services..."

ensure_node_modules "$PROJECT_DIR"
ensure_node_modules "$PROJECT_DIR/frontend"
ensure_node_modules "$PROJECT_DIR/mcp-server"

if is_port_listening "$APP_PORT"; then
  echo "WhatsApp server port $APP_PORT is already in use, skipping backend start."
else
  (cd "$PROJECT_DIR" && npm start > "$SERVER_LOG" 2>&1 & echo $! >> "$PID_FILE")
  echo "Backend started. Logs: $SERVER_LOG"
fi

wait_for_http "http://localhost:$APP_PORT/health" "Backend"
wait_for_connection 180 || true

SHOW_QR_NOW="$(prompt_yes_no "Show QR now? (y/N)" "N" "SHOW_QR_NOW")"
if [[ "$SHOW_QR_NOW" =~ ^[Yy]$ ]]; then
  qr_response=$(curl -s "http://localhost:$APP_PORT/qr" || true)
  if ! print_qr_from_api "$qr_response"; then
    echo "No QR available right now. Check logs or retry /qr later."
  fi
fi

if is_port_listening "$FRONTEND_PORT"; then
  echo "Frontend port $FRONTEND_PORT is already in use, skipping frontend start."
else
  (cd "$PROJECT_DIR/frontend" && npm run dev -- --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 & echo $! >> "$PID_FILE")
  echo "Frontend started. Logs: $FRONTEND_LOG"
fi

if is_port_listening "$MCP_PORT"; then
  echo "MCP port $MCP_PORT is already in use, skipping MCP start."
else
  (cd "$PROJECT_DIR/mcp-server" && TRANSPORT=sse PORT="$MCP_PORT" WHATSAPP_API_URL="http://localhost:$APP_PORT" node index.js > "$MCP_LOG" 2>&1 & echo $! >> "$PID_FILE")
  echo "MCP server started. Logs: $MCP_LOG"
fi

START_TUNNEL="$(prompt_yes_no "Start Cloudflare tunnel? (y/N)" "N" "START_TUNNEL")"
if [[ "$START_TUNNEL" =~ ^[Yy]$ ]]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared is not installed. Install it to start the tunnel."
  else
  if [ -f "$HOME/.cloudflared/config.yml" ]; then
    USE_NAMED="$(prompt_yes_no "Use named tunnel from ~/.cloudflared/config.yml? (y/N)" "Y" "USE_NAMED_TUNNEL")"
    if [[ "$USE_NAMED" =~ ^[Yy]$ ]]; then
      start_cloudflared_named
    else
      start_cloudflared_quick
    fi
  else
    start_cloudflared_quick
  fi
  fi
fi

echo ""
echo "Done. Open the dashboard at: http://localhost:${FRONTEND_PORT}"
echo "MCP SSE URL: http://localhost:${MCP_PORT}/sse"
