#!/bin/bash

# Interactive setup and launch for WhatsApp MCP Agent

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/whatsapp-agent.pid"

mkdir -p "$LOG_DIR"

prompt_value() {
  local label="$1"
  local default="$2"
  local secret="${3:-false}"
  local input=""

  if [ "$secret" = "true" ]; then
    printf "%s [%s]: " "$label" "$default"
    read -r -s input
    printf "\n"
  else
    printf "%s [%s]: " "$label" "$default"
    read -r input
  fi

  if [ -z "$input" ]; then
    input="$default"
  fi

  echo "$input"
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

echo "WhatsApp MCP Agent setup"
echo "------------------------"

APP_PORT="$(prompt_value "WhatsApp server port" "3005")"
MCP_PORT="$(prompt_value "MCP server port (SSE)" "3006")"
FRONTEND_PORT="$(prompt_value "Frontend port" "5173")"

GEMINI_API_KEY="$(prompt_value "Gemini API key (recommended)" "" true)"
GROQ_API_KEY="$(prompt_value "Groq API key (fallback)" "" true)"
OLLAMA_BASE_URL="$(prompt_value "Ollama base URL" "http://localhost:11434")"
OLLAMA_MODEL="$(prompt_value "Ollama model" "llama3.2")"
TODOIST_API_KEY="$(prompt_value "Todoist API key (optional)" "" true)"

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

echo ""
echo "Done. Open the dashboard at: http://localhost:$FRONTEND_PORT"
echo "MCP SSE URL: http://localhost:$MCP_PORT/sse"
