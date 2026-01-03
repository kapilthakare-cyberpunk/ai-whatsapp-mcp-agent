#!/bin/bash

# WhatsApp MCP Agent - Stop Services Script
# This script stops the WhatsApp MCP server and frontend services gracefully

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PID_FILE="$PROJECT_DIR/whatsapp-agent.pid"
LOG_DIR="$PROJECT_DIR/logs"

echo -e "${BLUE}🛑 Stopping WhatsApp MCP Agent Services...${NC}"
echo -e "${BLUE}Project Directory: $PROJECT_DIR${NC}"
echo ""

# Function to stop a process by PID
stop_process() {
    local pid=$1
    local name=$2
    local force=$3
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}ℹ️  No PID found for $name${NC}"
        return 0
    fi
    
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}ℹ️  Process $name (PID: $pid) is not running${NC}"
        return 0
    fi
    
    echo -e "${BLUE}⏹️  Stopping $name (PID: $pid)...${NC}"
    
    if [ "$force" = "true" ]; then
        # Force kill
        kill -9 "$pid" 2>/dev/null || true
        echo -e "${RED}❌ Force killed $name${NC}"
    else
        # Graceful shutdown
        kill "$pid" 2>/dev/null || true
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}✅ $name stopped gracefully${NC}"
                return 0
            fi
            sleep 1
        done
        
        # If still running, force kill
        echo -e "${YELLOW}⚠️  Graceful shutdown timeout, force killing $name...${NC}"
        kill -9 "$pid" 2>/dev/null || true
        echo -e "${RED}❌ Force killed $name${NC}"
    fi
}

# Function to stop process by name
stop_process_by_name() {
    local process_name=$1
    local display_name=$2
    
    echo -e "${BLUE}🔍 Looking for $display_name processes...${NC}"
    
    # Find processes by name
    local pids=$(pgrep -f "$process_name" || true)
    
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}ℹ️  No $display_name processes found${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📋 Found PIDs: $pids${NC}"
    
    # Stop each process
    for pid in $pids; do
        stop_process "$pid" "$display_name" "false"
    done
}

# Function to clean up PID file
cleanup_pid_file() {
    if [ -f "$PID_FILE" ]; then
        echo -e "${BLUE}🧹 Cleaning up PID file...${NC}"
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ PID file removed${NC}"
    fi
}

# Function to show running processes
show_running_processes() {
    echo -e "${BLUE}📊 Checking for running WhatsApp services...${NC}"
    
    # Check for Node.js processes running our server
    local node_processes=$(pgrep -f "node.*server.js" || true)
    if [ -n "$node_processes" ]; then
        echo -e "${YELLOW}⚠️  Found Node.js server processes: $node_processes${NC}"
    fi
    
    # Check for frontend processes
    local frontend_processes=$(pgrep -f "npm.*dev\|vite\|next" || true)
    if [ -n "$frontend_processes" ]; then
        echo -e "${YELLOW}⚠️  Found frontend processes: $frontend_processes${NC}"
    fi
    
    # Check for any processes using our ports
    local server_port_processes=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$server_port_processes" ]; then
        echo -e "${YELLOW}⚠️  Processes using port 3000: $server_port_processes${NC}"
    fi
    
    local frontend_port_processes=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$frontend_port_processes" ]; then
        echo -e "${YELLOW}⚠️  Processes using port 5173: $frontend_port_processes${NC}"
    fi
}

# Function to force stop everything
force_stop_all() {
    echo -e "${RED}🚨 Force stopping all WhatsApp services...${NC}"
    
    # Stop processes by name
    stop_process_by_name "server.js" "Backend Server"
    stop_process_by_name "npm.*dev\|vite" "Frontend Server"
    stop_process_by_name "node.*server" "Node.js Server"
    
    # Kill any remaining processes on our ports
    echo -e "${BLUE}🔪 Clearing port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo -e "${BLUE}🔪 Clearing port 5173...${NC}"
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    # Clean up any remaining PID files
    cleanup_pid_file
    
    echo -e "${RED}✅ Force stop completed${NC}"
}

# Function to graceful stop
graceful_stop() {
    echo -e "${BLUE}🤝 Attempting graceful shutdown...${NC}"
    
    # Stop processes using PID file if it exists
    if [ -f "$PID_FILE" ]; then
        echo -e "${BLUE}📋 Reading PIDs from file...${NC}"
        while IFS= read -r pid; do
            if [ -n "$pid" ] && [ "$pid" -gt 0 ]; then
                stop_process "$pid" "Service" "false"
            fi
        done < "$PID_FILE"
    fi
    
    # Stop processes by name
    stop_process_by_name "server.js" "Backend Server"
    stop_process_by_name "npm.*dev" "Frontend Server"
    
    # Clean up PID file
    cleanup_pid_file
    
    echo -e "${GREEN}✅ Graceful stop completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}=== WhatsApp MCP Agent Shutdown ===${NC}"
    
    # Check if force flag is set
    FORCE=false
    if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
        FORCE=true
        echo -e "${RED}🚨 Force mode enabled${NC}"
    fi
    
    # Show running processes first
    show_running_processes
    echo ""
    
    if [ "$FORCE" = "true" ]; then
        force_stop_all
    else
        graceful_stop
        
        # Check if any processes are still running
        echo ""
        echo -e "${BLUE}🔍 Verifying shutdown...${NC}"
        sleep 2
        
        local remaining_processes=$(pgrep -f "server.js\|npm.*dev" || true)
        if [ -n "$remaining_processes" ]; then
            echo -e "${YELLOW}⚠️  Some processes are still running: $remaining_processes${NC}"
            echo -e "${YELLOW}   Run with --force to force stop all processes${NC}"
        else
            echo -e "${GREEN}✅ All processes stopped successfully${NC}"
        fi
    fi
    
    # Show logs location
    if [ -d "$LOG_DIR" ]; then
        echo ""
        echo -e "${BLUE}📁 Log files available in: $LOG_DIR${NC}"
        echo -e "${BLUE}   Server logs: $LOG_DIR/server.log${NC}"
        echo -e "${BLUE}   Frontend logs: $LOG_DIR/frontend.log${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🛑 WhatsApp MCP Agent services stopped${NC}"
    echo -e "${BLUE}🔧 To start again: ./scripts/start-services.sh${NC}"
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo -e "${BLUE}WhatsApp MCP Agent - Stop Services Script${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -f, --force     Force stop all processes (including stuck ones)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0              # Graceful shutdown"
    echo "  $0 --force      # Force shutdown"
    echo ""
    exit 0
fi

# Run main function
main "$@"