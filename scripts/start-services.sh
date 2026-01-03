#!/bin/bash

# WhatsApp MCP Agent - Start Services Script
# This script starts the WhatsApp MCP server and frontend services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
SERVER_PORT=3000
FRONTEND_PORT=5173
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/whatsapp-agent.pid"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo -e "${BLUE}🚀 Starting WhatsApp MCP Agent Services...${NC}"
echo -e "${BLUE}Project Directory: $PROJECT_DIR${NC}"
echo -e "${BLUE}Server Port: $SERVER_PORT${NC}"
echo -e "${BLUE}Frontend Port: $FRONTEND_PORT${NC}"
echo ""

# Function to validate project structure
validate_project() {
    echo -e "${BLUE}🔍 Validating project structure...${NC}"
    
    # Check for required files
    local required_files=(
        "src/server.js"
        "package.json"
    )
    
    local missing_files=()
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required files:${NC}"
        for file in "${missing_files[@]}"; do
            echo -e "${RED}   - $file${NC}"
        done
        return 1
    fi
    
    # Check for required directories
    local required_dirs=(
        "utils"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$PROJECT_DIR/$dir" ]; then
            echo -e "${RED}❌ Missing required directory: $dir${NC}"
            return 1
        fi
    done
    
    # Check for critical dependencies
    echo -e "${BLUE}📦 Checking critical dependencies...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if sqlite3 is installed
    if ! npm list sqlite3 >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  SQLite3 not found, installing...${NC}"
        npm install sqlite3
    fi
    
    # Check for required utility files
    if [ ! -f "$PROJECT_DIR/utils/sqlite-database.js" ]; then
        echo -e "${RED}❌ Missing utils/sqlite-database.js${NC}"
        return 1
    fi
    
    if [ ! -f "$PROJECT_DIR/utils/baileys-client.js" ]; then
        echo -e "${RED}❌ Missing utils/baileys-client.js${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Project structure validation passed${NC}"
    return 0
}

# Function to test critical imports
test_imports() {
    echo -e "${BLUE}🧪 Testing critical imports...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Create a temporary test script
    cat > /tmp/test_imports.js << 'EOF'
try {
    // Test SQLite database import
    const SQLiteDatabase = require('./utils/sqlite-database.js');
    console.log('✅ SQLiteDatabase import: OK');
    
    // Test Baileys client import
    const BaileysWhatsAppClient = require('./utils/baileys-client.js');
    console.log('✅ BaileysWhatsAppClient import: OK');
    
    // Test creating instances
    const db = new SQLiteDatabase();
    console.log('✅ SQLiteDatabase instantiation: OK');
    
    const client = new BaileysWhatsAppClient();
    console.log('✅ BaileysWhatsAppClient instantiation: OK');
    
    console.log('🎉 All critical imports working!');
    process.exit(0);
} catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
EOF
    
    # Run the test
    if node /tmp/test_imports.js; then
        echo -e "${GREEN}✅ Critical imports test passed${NC}"
        rm -f /tmp/test_imports.js
        return 0
    else
        echo -e "${RED}❌ Critical imports test failed${NC}"
        rm -f /tmp/test_imports.js
        return 1
    fi
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to start the backend server
start_backend() {
    echo -e "${BLUE}📡 Starting WhatsApp MCP Server...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    # Start the server in background
    nohup npm start > "$LOG_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    echo -e "${GREEN}✅ Server started with PID: $SERVER_PID${NC}"
    echo -e "${BLUE}📊 Server logs: $LOG_DIR/server.log${NC}"
    
    # Wait for server to be ready
    echo -e "${BLUE}⏳ Waiting for server to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$SERVER_PORT/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Server is ready!${NC}"
            return 0
        fi
        sleep 2
    done
    
    echo -e "${RED}❌ Server failed to start within 60 seconds${NC}"
    return 1
}

# Function to start the frontend (if it exists)
start_frontend() {
    if [ -d "$PROJECT_DIR/frontend" ]; then
        echo -e "${BLUE}🌐 Starting Frontend Development Server...${NC}"
        
        cd "$PROJECT_DIR/frontend"
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
            npm install
        fi
        
        # Start frontend in background
        nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID >> "$PID_FILE"
        
        echo -e "${GREEN}✅ Frontend started with PID: $FRONTEND_PID${NC}"
        echo -e "${BLUE}📊 Frontend logs: $LOG_DIR/frontend.log${NC}"
        
        # Wait for frontend to be ready
        echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
        for i in {1..30}; do
            if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Frontend is ready!${NC}"
                return 0
            fi
            sleep 2
        done
        
        echo -e "${YELLOW}⚠️  Frontend may still be starting up${NC}"
    else
        echo -e "${YELLOW}ℹ️  No frontend directory found, skipping frontend startup${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}=== WhatsApp MCP Agent Startup ===${NC}"
    
    # Check if services are already running
    if [ -f "$PID_FILE" ]; then
        echo -e "${YELLOW}⚠️  Services may already be running${NC}"
        echo -e "${YELLOW}   Run './scripts/stop-services.sh' first if you want to restart${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Startup cancelled${NC}"
            exit 0
        fi
    fi
    
    # Step 1: Validate project structure
    if ! validate_project; then
        echo -e "${RED}❌ Project validation failed. Please fix the issues above.${NC}"
        exit 1
    fi
    
    # Step 2: Test critical imports
    if ! test_imports; then
        echo -e "${RED}❌ Critical imports test failed. Please fix import errors.${NC}"
        echo -e "${YELLOW}💡 Common solutions:${NC}"
        echo -e "${YELLOW}   - Ensure all dependencies are installed: npm install${NC}"
        echo -e "${YELLOW}   - Check that utils/sqlite-database.js exists${NC}"
        echo -e "${YELLOW}   - Verify utils/baileys-client.js has correct imports${NC}"
        exit 1
    fi
    
    # Step 3: Check ports
    echo -e "${BLUE}🔍 Checking port availability...${NC}"
    if ! check_port $SERVER_PORT; then
        echo -e "${RED}❌ Cannot start server on port $SERVER_PORT${NC}"
        echo -e "${YELLOW}💡 Try: lsof -ti:$SERVER_PORT | xargs kill -9${NC}"
        exit 1
    fi
    
    # Step 4: Start backend
    if ! start_backend; then
        echo -e "${RED}❌ Failed to start backend server${NC}"
        echo -e "${BLUE}📊 Check logs: $LOG_DIR/server.log${NC}"
        exit 1
    fi
    
    # Step 5: Start frontend
    start_frontend
    
    echo ""
    echo -e "${GREEN}🎉 All services started successfully!${NC}"
    echo -e "${BLUE}📊 Server: http://localhost:$SERVER_PORT${NC}"
    echo -e "${BLUE}🌐 Frontend: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${BLUE}📋 Health Check: http://localhost:$SERVER_PORT/health${NC}"
    echo ""
    echo -e "${BLUE}📁 Logs Directory: $LOG_DIR${NC}"
    echo -e "${BLUE}🔧 Management: Use './scripts/stop-services.sh' to stop services${NC}"
    echo ""
    echo -e "${GREEN}✅ WhatsApp MCP Agent is now running!${NC}"
}

# Run main function
main "$@"