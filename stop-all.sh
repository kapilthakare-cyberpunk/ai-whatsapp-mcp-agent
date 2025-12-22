#!/bin/bash

# 🛑 WhatsApp AI Agent - Stop All Services Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🛑 Stopping WhatsApp AI Agent Services               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Read PIDs if available
if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend already stopped${NC}"
    fi
    rm "$PROJECT_ROOT/.backend.pid"
else
    echo -e "${YELLOW}⚠️  No backend PID file found${NC}"
fi

if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/.frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend already stopped${NC}"
    fi
    rm "$PROJECT_ROOT/.frontend.pid"
else
    echo -e "${YELLOW}⚠️  No frontend PID file found${NC}"
fi

# Also kill any lingering processes on ports
echo -e "${BLUE}🧹 Cleaning up ports...${NC}"

# Kill port 3000 (Backend)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 3000 cleared${NC}"
fi

# Kill port 5173 (Frontend)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti :5173 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 5173 cleared${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗"
echo -e "║     ✅ All Services Stopped                               ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "To start again, run: ${BLUE}./start-all.sh${NC}"
echo ""