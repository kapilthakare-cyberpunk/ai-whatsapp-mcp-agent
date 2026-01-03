#!/bin/bash

# WhatsApp MCP Server Test Script

echo "🧪 Testing WhatsApp MCP Setup"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if WhatsApp server is running
echo "📡 Test 1: WhatsApp Server Status"
HEALTH_CHECK=$(curl -s http://localhost:3000/health 2>/dev/null)

if [ -z "$HEALTH_CHECK" ]; then
    echo -e "${RED}❌ WhatsApp server not running${NC}"
    echo "   Start it with: cd .. && npm start"
    exit 1
else
    echo -e "${GREEN}✅ WhatsApp server is running${NC}"
    echo "   $HEALTH_CHECK"
fi
echo ""

# Test 2: Check connection status
echo "📱 Test 2: WhatsApp Connection"
STATUS=$(curl -s http://localhost:3000/status 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" == "connected" ]; then
    echo -e "${GREEN}✅ WhatsApp is connected${NC}"
else
    echo -e "${YELLOW}⚠️  WhatsApp not connected${NC}"
    echo "   Scan QR code with: curl http://localhost:3000/qr"
fi
echo ""

# Test 3: Check MCP server files
echo "📁 Test 3: MCP Server Files"
if [ -f "index.js" ] && [ -f "package.json" ]; then
    echo -e "${GREEN}✅ MCP server files present${NC}"
else
    echo -e "${RED}❌ MCP server files missing${NC}"
    exit 1
fi
echo ""

# Test 4: Check dependencies
echo "📦 Test 4: Dependencies"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo "   Run: npm install"
fi
echo ""

# Test 5: Test MCP server (quick syntax check)
echo "🔧 Test 5: MCP Server Syntax"
node -c index.js 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MCP server syntax is valid${NC}"
else
    echo -e "${RED}❌ MCP server has syntax errors${NC}"
    node -c index.js
    exit 1
fi
echo ""

# Test 6: Check Claude config
echo "⚙️  Test 6: Claude Config"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    if grep -q "whatsapp" "$CLAUDE_CONFIG"; then
        echo -e "${GREEN}✅ WhatsApp MCP configured in Claude${NC}"
    else
        echo -e "${YELLOW}⚠️  WhatsApp MCP not in Claude config${NC}"
        echo "   Add config from: claude_desktop_config.json"
    fi
else
    echo -e "${YELLOW}⚠️  Claude config file not found${NC}"
    echo "   Location: $CLAUDE_CONFIG"
fi
echo ""

# Test 7: Test API endpoints
echo "🌐 Test 7: API Endpoints"

# Test unread endpoint
UNREAD=$(curl -s http://localhost:3000/unread 2>/dev/null)
if echo "$UNREAD" | grep -q "messages"; then
    echo -e "${GREEN}✅ /unread endpoint working${NC}"
else
    echo -e "${RED}❌ /unread endpoint failed${NC}"
fi

# Test briefing endpoint
BRIEFING=$(curl -s http://localhost:3000/briefing 2>/dev/null)
if echo "$BRIEFING" | grep -q "status"; then
    echo -e "${GREEN}✅ /briefing endpoint working${NC}"
else
    echo -e "${RED}❌ /briefing endpoint failed${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Test Summary"
echo "=============================="
echo ""
echo "Next Steps:"
echo "1. ✅ Ensure WhatsApp server is running"
echo "2. ✅ Scan QR code if not connected"
echo "3. ✅ Add config to Claude Desktop"
echo "4. ✅ Restart Claude Desktop"
echo "5. ✅ Test with: 'Show me unread messages'"
echo ""
echo "Test with Claude:"
echo '  "Show me my unread WhatsApp messages"'
echo '  "Give me a briefing of my WhatsApp"'
echo '  "Check if WhatsApp is connected"'
echo ""
echo "For more info: cat README.md"
