#!/bin/bash

# 🔍 WhatsApp MCP Agent - Quick Health Check
# Run this to verify everything is working

echo "🔍 Checking WhatsApp MCP Agent Status..."
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/home/kapilt/Projects/ai-whatsapp-mcp-agent"

# Check if directories exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/backup-configs" ]; then
    echo -e "${RED}❌ Backup directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project structure OK${NC}"

# Check WhatsApp backend
echo ""
echo "📱 Checking WhatsApp Backend..."
if curl -s http://localhost:3000/status > /dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3000/status | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "connected" ]; then
        echo -e "${GREEN}✅ WhatsApp Backend: Connected${NC}"
    else
        echo -e "${YELLOW}⚠️  WhatsApp Backend: $STATUS${NC}"
    fi
else
    echo -e "${RED}❌ WhatsApp Backend: Not running${NC}"
fi

# Check MCP server process
echo ""
echo "🔧 Checking MCP Server..."
if ps aux | grep -v grep | grep "node.*mcp-server.*index.js" > /dev/null; then
    MCP_PID=$(ps aux | grep -v grep | grep "node.*mcp-server.*index.js" | awk '{print $2}')
    echo -e "${GREEN}✅ MCP Server: Running (PID: $MCP_PID)${NC}"
else
    echo -e "${RED}❌ MCP Server: Not running${NC}"
fi

# Check Claude Desktop
echo ""
echo "🤖 Checking Claude Desktop..."
if ps aux | grep -v grep | grep "claude-desktop" > /dev/null; then
    echo -e "${GREEN}✅ Claude Desktop: Running${NC}"
else
    echo -e "${RED}❌ Claude Desktop: Not running${NC}"
fi

# Check 5ire
echo ""
echo "🎯 Checking 5ire..."
if ps aux | grep -v grep | grep -i 5ire > /dev/null; then
    echo -e "${GREEN}✅ 5ire: Running${NC}"
else
    echo -e "${RED}❌ 5ire: Not running${NC}"
fi

# Test MCP functionality
echo ""
echo "🧪 Testing MCP Server..."
cd "$PROJECT_DIR/mcp-server" 2>/dev/null
if [ $? -eq 0 ]; then
    if node test-mcp.js 2>/dev/null | grep -q "tools"; then
        echo -e "${GREEN}✅ MCP Server: Responding correctly${NC}"
    else
        echo -e "${RED}❌ MCP Server: Not responding${NC}"
    fi
else
    echo -e "${RED}❌ Cannot access MCP server directory${NC}"
fi

# Check backup files
echo ""
echo "📦 Checking Backup Files..."
BACKUP_FILES=(
    "backup-configs/RESTORE_GUIDE.md"
    "backup-configs/restore.sh"
    "backup-configs/claude_desktop_config.json.backup"
    "backup-configs/mcp-server-package.json"
    "backup-configs/main-package.json"
)

for file in "${BACKUP_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
    fi
done

echo ""
echo "========================================"
echo "💡 Quick fixes:"
echo "   Start backend: cd $PROJECT_DIR && npm start"
echo "   Start MCP: cd $PROJECT_DIR/mcp-server && npm start"
echo "   Restart Claude: pkill -f claude-desktop && nohup claude-desktop > /dev/null 2>&1 &"
echo "   Full restore: ./backup-configs/restore.sh"