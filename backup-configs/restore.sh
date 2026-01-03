#!/bin/bash

# 🚀 WhatsApp MCP Agent - One-Click Restore Script
# Run this to restore everything to working state

echo "🔄 Starting WhatsApp MCP Agent Restore..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/kapilt/Projects/ai-whatsapp-mcp-agent"
BACKUP_DIR="$PROJECT_DIR/backup-configs"

# Function to print status
status() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory not found: $BACKUP_DIR"
    error "Please run this script from the ai-whatsapp-mcp-agent directory"
    exit 1
fi

status "Backup directory found"

# 1. Restore Claude Desktop config
echo "📋 Restoring Claude Desktop configuration..."
if cp "$BACKUP_DIR/claude_desktop_config.json.backup" ~/.config/Claude/claude_desktop_config.json 2>/dev/null; then
    status "Claude Desktop config restored"
else
    error "Failed to restore Claude Desktop config"
fi

# 1.5. Restore 5ire config
echo "📋 Restoring 5ire configuration..."
if cp "$BACKUP_DIR/5ire-mcp.json.backup" ~/.config/5ire/mcp.json 2>/dev/null; then
    status "5ire config restored"
else
    warning "Failed to restore 5ire config (5ire may not be installed)"
fi

# 2. Restore MCP server package.json
echo "📦 Restoring MCP server configuration..."
if cp "$BACKUP_DIR/mcp-server-package.json" "$PROJECT_DIR/mcp-server/package.json"; then
    status "MCP server package.json restored"
else
    error "Failed to restore MCP server package.json"
fi

# 3. Restore main package.json
if cp "$BACKUP_DIR/main-package.json" "$PROJECT_DIR/package.json"; then
    status "Main package.json restored"
else
    error "Failed to restore main package.json"
fi

# 4. Restore environment file if it exists
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "$PROJECT_DIR/"
    status "Environment file restored"
else
    warning "No .env file found in backup"
fi

# 5. Install dependencies
echo "📥 Installing dependencies..."
cd "$PROJECT_DIR"
if npm install; then
    status "Main project dependencies installed"
else
    error "Failed to install main project dependencies"
fi

cd "$PROJECT_DIR/mcp-server"
if npm install; then
    status "MCP server dependencies installed"
else
    error "Failed to install MCP server dependencies"
fi

# 6. Start services
echo "🚀 Starting services..."

# Start WhatsApp backend
cd "$PROJECT_DIR"
echo "Starting WhatsApp backend..."
npm start &
BACKEND_PID=$!
status "WhatsApp backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Start MCP server
cd "$PROJECT_DIR/mcp-server"
echo "Starting MCP server..."
npm start &
MCP_PID=$!
status "MCP server started (PID: $MCP_PID)"

# 7. Restart Claude Desktop
echo "🔄 Restarting Claude Desktop..."
pkill -f "claude-desktop" 2>/dev/null
sleep 2
nohup claude-desktop > /dev/null 2>&1 &
status "Claude Desktop restarted"

# 8. Test the setup
echo "🧪 Testing setup..."
sleep 5

# Test WhatsApp status
if curl -s http://localhost:3000/status | grep -q "connected"; then
    status "WhatsApp backend is connected"
else
    warning "WhatsApp backend status check failed - may need QR code scan"
fi

# Test MCP server
cd "$PROJECT_DIR/mcp-server"
if node test-mcp.js 2>/dev/null | grep -q "tools"; then
    status "MCP server is responding correctly"
else
    error "MCP server test failed"
fi

echo ""
echo "🎉 Restore complete!"
echo ""
echo "📋 Process IDs:"
echo "   WhatsApp Backend: $BACKEND_PID"
echo "   MCP Server: $MCP_PID"
echo ""
echo "🧪 Test commands:"
echo "   WhatsApp status: curl http://localhost:3000/status"
echo "   MCP test: cd mcp-server && node test-mcp.js"
echo ""
echo "💡 In Claude Desktop, try asking: 'Check my WhatsApp messages'"
echo ""
warning "If WhatsApp isn't connected, visit http://localhost:3000/qr to scan QR code"