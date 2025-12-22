#!/bin/bash

# 🚀 WhatsApp AI Agent - All Servers Starter Script
# This script starts all necessary services for the WhatsApp AI Agent

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🚀 WhatsApp AI Agent - Server Starter                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠️  Port $1 is in use. Killing existing process...${NC}"
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check if Ollama is available (optional)
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✅ Ollama available (optional AI fallback)${NC}"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Ollama is running${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Ollama not running. Starting...${NC}"
        ollama serve &>/dev/null &
        sleep 2
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            echo -e "${GREEN}   ✓ Ollama started successfully${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Could not start Ollama automatically${NC}"
            echo -e "${YELLOW}      Run 'ollama serve' in a separate terminal${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Ollama not installed (optional - will use cloud APIs)${NC}"
    echo -e "   Install from: https://ollama.ai/"
fi

echo ""

# Kill existing processes on ports
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
kill_port 3000  # Backend
kill_port 5173  # Frontend (Vite default)
echo -e "${GREEN}✅ Ports cleared${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd "$PROJECT_ROOT"
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies already installed${NC}"
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

echo ""

# Check .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo -e "${YELLOW}⚠️  Please edit .env file with your API keys${NC}"
    echo -e "${YELLOW}   Then run this script again${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗"
echo -e "║     Starting Services...                                  ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Start Backend Server
echo -e "${BLUE}🔧 Starting Backend Server (port 3000)...${NC}"
cd "$PROJECT_ROOT"
npm start > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "   Logs: $PROJECT_ROOT/logs/backend.log"

# Wait for backend to be ready
echo -e "${YELLOW}   Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}   ✗ Backend failed to start. Check logs/backend.log${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Start Frontend Server
echo -e "${BLUE}🎨 Starting Frontend Server (port 5173)...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "   Logs: $PROJECT_ROOT/logs/frontend.log"

# Wait for frontend to be ready
echo -e "${YELLOW}   Waiting for frontend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}   ✗ Frontend failed to start. Check logs/frontend.log${NC}"
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗"
echo -e "║     ✅ All Services Running!                              ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Access URLs:${NC}"
echo -e "   Dashboard:  ${GREEN}http://localhost:5173${NC}"
echo -e "   Backend:    ${GREEN}http://localhost:3000${NC}"
echo -e "   Health:     ${GREEN}http://localhost:3000/health${NC}"
echo ""
echo -e "${BLUE}🔧 AI Services Status:${NC}"

# Check AI services
if [ -n "$GROQ_API_KEY" ] && [ "$GROQ_API_KEY" != "your_groq_api_key_here" ]; then
    echo -e "   ${GREEN}✓ Groq API (Primary)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Groq API not configured${NC}"
fi

if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ]; then
    echo -e "   ${GREEN}✓ Gemini API (Secondary)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Gemini API not configured${NC}"
fi

if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Ollama (Local Fallback)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Ollama not running (optional)${NC}"
fi

echo ""
echo -e "${BLUE}📝 Process IDs:${NC}"
echo -e "   Backend:  ${BACKEND_PID}"
echo -e "   Frontend: ${FRONTEND_PID}"
echo ""
echo -e "${BLUE}🛑 To stop all services:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   or press Ctrl+C"
echo ""
echo -e "${YELLOW}💡 Tip: View logs in real-time:${NC}"
echo -e "   tail -f $PROJECT_ROOT/logs/backend.log"
echo -e "   tail -f $PROJECT_ROOT/logs/frontend.log"
echo ""

# Save PIDs for cleanup script
echo "$BACKEND_PID" > "$PROJECT_ROOT/.backend.pid"
echo "$FRONTEND_PID" > "$PROJECT_ROOT/.frontend.pid"

# Keep script running and show logs
echo -e "${BLUE}Tailing logs (Ctrl+C to stop)...${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
tail -f "$PROJECT_ROOT/logs/backend.log" "$PROJECT_ROOT/logs/frontend.log"