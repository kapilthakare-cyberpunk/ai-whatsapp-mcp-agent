#!/bin/bash

# Interactive setup and launch for WhatsApp MCP Agent

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/whatsapp-agent.pid"
CF_LOG="$LOG_DIR/cloudflared.log"

mkdir -p "$LOG_DIR"

is_tty() {
  [ -t 0 ] || [ -t 1 ]
}

prompt_value() {
  local label="$1"
  local default="$2"
  local env_name="$3"
  local secret="${4:-false}"
  local input=""
  local tty_in="/dev/tty"
  local use_tty=false

  if [ -n "$env_name" ] && [ -n "${!env_name}" ]; then
    echo "${!env_name}"
    return 0
  fi

  if ! is_tty && [ -r "$tty_in" ]; then
    use_tty=true
  fi

  if [ "$secret" = "true" ]; then
    printf "%s [%s]: " "$label" "$default"
    if [ "$use_tty" = true ]; then
      read -r -s input < "$tty_in"
    else
      read -r -s input
    fi
    printf "\n"
  else
    printf "%s [%s]: " "$label" "$default"
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
    url=$(rg -o "https://[a-z0-9-]+\\.trycloudflare\\.com" "$CF_LOG" | tail -n 1)
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
  tunnel_name=$(rg -o "tunnel:\\s*([^\\s]+)" -r '$1' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -n 1)
  local hostname
  hostname=$(rg -o "hostname:\\s*([^\\s]+)" -r '$1' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -n 1)
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

APP_PORT="$(prompt_value "WhatsApp server port" "3005" "APP_PORT")"
MCP_PORT="$(prompt_value "MCP server port (SSE)" "3006" "MCP_PORT")"
FRONTEND_PORT="$(prompt_value "Frontend port" "5173" "FRONTEND_PORT")"
WIPE_CONFIRM="$(prompt_yes_no "Full wipe (logout + delete database)? (y/N)" "N" "WIPE_CONFIRM")"

GEMINI_API_KEY="$(prompt_value "Gemini API key (recommended)" "" "GEMINI_API_KEY" true)"
GROQ_API_KEY="$(prompt_value "Groq API key (fallback)" "" "GROQ_API_KEY" true)"
OLLAMA_BASE_URL="$(prompt_value "Ollama base URL" "http://localhost:11434" "OLLAMA_BASE_URL")"
OLLAMA_MODEL="$(prompt_value "Ollama model" "llama3.2" "OLLAMA_MODEL")"
TODOIST_API_KEY="$(prompt_value "Todoist API key (optional)" "" "TODOIST_API_KEY" true)"

if [[ "$WIPE_CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Performing full wipe..."
  full_wipe
fi

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

# Server Configuration
PORT=$APP_PORT

# MCP Broker Configuration (optional)
MCP_BROKER_URL=http://localhost:8080
MCP_TOPIC=whatsapp_messages
EOF

cat <<EOF > "$PROJECT_DIR/mcp-server/.env"
WHATSAPP_API_URL=http://localhost:$APP_PORT
TRANSPORT=sse
PORT=$MCP_PORT
EOF

cat <<EOF > "$PROJECT_DIR/frontend/.env"
VITE_API_URL=http://localhost:$APP_PORT
EOF

echo ""
echo "Config written:"
echo "  - $PROJECT_DIR/.env"
echo "  - $PROJECT_DIR/mcp-server/.env"
echo "  - $PROJECT_DIR/frontend/.env"
echo ""

echo "Starting services..."

if is_port_listening "$APP_PORT"; then
  echo "WhatsApp server port $APP_PORT is already in use, skipping backend start."
else
  (cd "$PROJECT_DIR" && npm start > "$LOG_DIR/server.log" 2>&1 & echo $! >> "$PID_FILE")
  echo "Backend started. Logs: $LOG_DIR/server.log"
fi

if is_port_listening "$FRONTEND_PORT"; then
  echo "Frontend port $FRONTEND_PORT is already in use, skipping frontend start."
else
  (cd "$PROJECT_DIR/frontend" && npm install >/dev/null 2>&1)
  (cd "$PROJECT_DIR/frontend" && npm run dev -- --port "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 & echo $! >> "$PID_FILE")
  echo "Frontend started. Logs: $LOG_DIR/frontend.log"
fi

if is_port_listening "$MCP_PORT"; then
  echo "MCP port $MCP_PORT is already in use, skipping MCP start."
else
  (cd "$PROJECT_DIR/mcp-server" && npm install >/dev/null 2>&1)
  (cd "$PROJECT_DIR/mcp-server" && TRANSPORT=sse PORT="$MCP_PORT" WHATSAPP_API_URL="http://localhost:$APP_PORT" node index.js > "$LOG_DIR/mcp-server.log" 2>&1 & echo $! >> "$PID_FILE")
  echo "MCP server started. Logs: $LOG_DIR/mcp-server.log"
fi

START_TUNNEL="$(prompt_yes_no "Start Cloudflare tunnel? (y/N)" "N" "START_TUNNEL")"
if [[ "$START_TUNNEL" =~ ^[Yy]$ ]]; then
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

echo ""
echo "Done. Open the dashboard at: http://localhost:${FRONTEND_PORT}"
echo "MCP SSE URL: http://localhost:${MCP_PORT}/sse"
