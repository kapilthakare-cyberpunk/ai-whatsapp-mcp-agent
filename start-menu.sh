#!/bin/bash

# 🚀 WhatsApp MCP Server - Start Menu
# Interactive menu to start different MCP server options

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Function to display the menu
show_menu() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   🚀 WhatsApp MCP Server - Start Menu                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}Available Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}. Start WhatsApp MCP Stdio Server (for 5ire)"
    echo -e "     Uses: mcp-server/mcp-5ire.js"
    echo -e "     Transport: stdio"
    echo ""
    echo -e "  ${GREEN}2${NC}. Start WhatsApp MCP Server Node (for Claude Desktop)"
    echo -e "     Uses: mcp-server/index.js"
    echo -e "     Transport: stdio"
    echo ""
    echo -e "  ${GREEN}3${NC}. Start Backend Server Only (Port 3000)"
    echo -e "     WhatsApp Express.js API"
    echo ""
    echo -e "  ${GREEN}4${NC}. Start All (Backend + 5ire MCP Server)"
    echo -e "     Combined startup"
    echo ""
    echo -e "  ${YELLOW}0${NC}. Exit"
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to check port
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠️  Port $1 is in use. Killing existing process...${NC}"
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function 1: Start 5ire MCP Stdio Server
start_5ire_mcp() {
    echo -e "${BLUE}🚀 Starting WhatsApp MCP Stdio Server (5ire)...${NC}"
    echo ""
    
    # Check if backend is running
    if ! curl -s http://localhost:3000/status >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Backend not running. Starting backend first...${NC}"
        cd "$PROJECT_ROOT"
        npm start > "$LOG_DIR/backend.log" 2>&1 &
        echo "   Waiting for backend..."
        for i in {1..15}; do
            if curl -s http://localhost:3000/status >/dev/null 2>&1; then
                echo -e "${GREEN}   ✓ Backend ready!${NC}"
                break
            fi
            sleep 1
        done
        echo ""
    else
        echo -e "${GREEN}✓ Backend already running${NC}"
        echo ""
    fi
    
    echo -e "${BLUE}Starting MCP Stdio Server...${NC}"
    cd "$PROJECT_ROOT/mcp-server"
    
    echo -e "${YELLOW}Command: ${NC}node mcp-5ire.js"
    echo -e "${YELLOW}API URL: ${NC}http://localhost:3000"
    echo ""
    echo -e "${GREEN}✅ Server starting... Press Ctrl+C to stop${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    WHATSAPP_API_URL=http://localhost:3000 node mcp-5ire.js
}

# Function 2: Start Claude Desktop MCP Server
start_claude_mcp() {
    echo -e "${BLUE}🚀 Starting WhatsApp MCP Server Node (Claude Desktop)...${NC}"
    echo ""
    
    # Check if backend is running
    if ! curl -s http://localhost:3000/status >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Backend not running. Starting backend first...${NC}"
        cd "$PROJECT_ROOT"
        npm start > "$LOG_DIR/backend.log" 2>&1 &
        echo "   Waiting for backend..."
        for i in {1..15}; do
            if curl -s http://localhost:3000/status >/dev/null 2>&1; then
                echo -e "${GREEN}   ✓ Backend ready!${NC}"
                break
            fi
            sleep 1
        done
        echo ""
    else
        echo -e "${GREEN}✓ Backend already running${NC}"
        echo ""
    fi
    
    echo -e "${BLUE}Starting MCP Server...${NC}"
    cd "$PROJECT_ROOT/mcp-server"
    
    echo -e "${YELLOW}Command: ${NC}node index.js"
    echo -e "${YELLOW}API URL: ${NC}http://localhost:3000"
    echo ""
    echo -e "${GREEN}✅ Server starting... Press Ctrl+C to stop${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    WHATSAPP_API_URL=http://localhost:3000 node index.js
}

# Function 3: Start Backend Only
start_backend_only() {
    echo -e "${BLUE}🚀 Starting Backend Server (Port 3000)...${NC}"
    echo ""
    
    kill_port 3000
    
    cd "$PROJECT_ROOT"
    echo -e "${YELLOW}Command: ${NC}npm start"
    echo ""
    echo -e "${GREEN}✅ Backend starting on http://localhost:3000${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Available Endpoints:${NC}"
    echo "   /status - Connection status"
    echo "   /health - Health check"
    echo "   /qr - Get QR code for WhatsApp"
    echo "   /messages - Get unread messages"
    echo "   /send - Send a message (POST)"
    echo "   /briefing - Get AI briefing (POST)"
    echo "   /draft - Generate reply (POST)"
    echo "   /search - Search messages"
    echo "   /history/{contact} - Get conversation history"
    echo "   /contacts - List all contacts"
    echo "   /chats - Get recent chats"
    echo "   /create-group - Create WhatsApp group (POST)"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    
    npm start
}

# Function 4: Start All (Backend + 5ire MCP)
start_all() {
    echo -e "${BLUE}🚀 Starting All Services (Backend + 5ire MCP)...${NC}"
    echo ""
    
    kill_port 3000
    
    # Start Backend
    echo -e "${BLUE}1. Starting Backend Server (Port 3000)...${NC}"
    cd "$PROJECT_ROOT"
    npm start > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    
    # Wait for backend
    echo "   Waiting for backend..."
    for i in {1..15}; do
        if curl -s http://localhost:3000/status >/dev/null 2>&1; then
            echo -e "${GREEN}   ✓ Backend ready!${NC}"
            break
        fi
        sleep 1
    done
    echo ""
    
    # Start MCP Server
    echo -e "${BLUE}2. Starting MCP Stdio Server (5ire)...${NC}"
    cd "$PROJECT_ROOT/mcp-server"
    WHATSAPP_API_URL=http://localhost:3000 node mcp-5ire.js > "$LOG_DIR/mcp-5ire.log" 2>&1 &
    MCP_PID=$!
    echo -e "${GREEN}✓ MCP Server started (PID: $MCP_PID)${NC}"
    echo ""
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗"
    echo -e "║   ✅ All Services Running!                                  ║"
    echo -e "╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 Access Points:${NC}"
    echo "   Backend: http://localhost:3000"
    echo "   MCP Server: Running on stdio"
    echo ""
    echo -e "${BLUE}📝 Process IDs:${NC}"
    echo "   Backend: $BACKEND_PID"
    echo "   MCP: $MCP_PID"
    echo ""
    echo -e "${BLUE}📋 Logs:${NC}"
    echo "   Backend: $LOG_DIR/backend.log"
    echo "   MCP: $LOG_DIR/mcp-5ire.log"
    echo ""
    echo -e "${BLUE}🛑 To stop all:${NC}"
    echo "   kill $BACKEND_PID $MCP_PID"
    echo ""
    echo -e "${YELLOW}Tailing logs... Press Ctrl+C to stop${NC}"
    echo ""
    
    # Keep running
    tail -f "$LOG_DIR/backend.log" "$LOG_DIR/mcp-5ire.log" 2>/dev/null || wait
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter your choice [0-4]: " choice
    
    case $choice in
        1)
            start_5ire_mcp
            ;;
        2)
            start_claude_mcp
            ;;
        3)
            start_backend_only
            ;;
        4)
            start_all
            ;;
        0)
            echo -e "${GREEN}Goodbye! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            sleep 2
            ;;
    esac
done
