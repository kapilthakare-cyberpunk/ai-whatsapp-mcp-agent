#!/bin/bash

# 5ire Advanced WhatsApp Setup Script
# Quickly configure and start the system

set -e

echo "🚀 5ire Advanced WhatsApp Setup"
echo "==============================="
echo ""

# Check 5ire
echo "📦 Checking 5ire..."
if [ -f "/home/kapilt/Applications/5ire.appimage" ]; then
    echo "✅ 5ire found: /home/kapilt/Applications/5ire.appimage"
    ls -lh /home/kapilt/Applications/5ire.appimage | awk '{print "   Size:", $5}'
else
    echo "❌ 5ire not found!"
    exit 1
fi

# Check MCP server
echo ""
echo "🔧 Checking MCP server..."
if [ -f "/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/mcp-5ire.js" ]; then
    echo "✅ MCP server found: mcp-5ire.js"
else
    echo "❌ MCP server not found!"
    exit 1
fi

# Check configuration
echo ""
echo "⚙️  Checking configuration..."
if [ -f "/home/kapilt/Projects/ai-whatsapp-mcp-agent/5ire-mcp-config.json" ]; then
    echo "✅ MCP config template found"
    echo "   Location: 5ire-mcp-config.json"
else
    echo "❌ MCP config not found!"
    exit 1
fi

# Check WhatsApp backend
echo ""
echo "🔌 Checking WhatsApp backend..."
if [ -f "/home/kapilt/Projects/ai-whatsapp-mcp-agent/src/server.js" ]; then
    echo "✅ WhatsApp backend found"
else
    echo "❌ Backend not found!"
    exit 1
fi

# Try to connect to backend
echo ""
echo "🌐 Testing backend connection..."
if curl -s http://localhost:3000/status > /dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3000/status | grep -o '"status":"[^"]*"')
    echo "✅ Backend running: $STATUS"
else
    echo "⚠️  Backend not running (start with: npm start)"
fi

# Summary
echo ""
echo "📋 SETUP SUMMARY"
echo "==============="
echo ""
echo "1️⃣  Start WhatsApp Backend:"
echo "    cd /home/kapilt/Projects/ai-whatsapp-mcp-agent"
echo "    npm start"
echo ""
echo "2️⃣  Start 5ire:"
echo "    /home/kapilt/Applications/5ire.appimage"
echo ""
echo "3️⃣  Import MCP Configuration in 5ire:"
echo "    Settings → MCP Servers → Import Configuration"
echo "    Paste content from: 5ire-mcp-config.json"
echo ""
echo "4️⃣  Available Tools:"
echo "    • send_whatsapp_message"
echo "    • get_unread_messages"
echo "    • get_briefing"
echo "    • generate_reply_draft"
echo "    • search_messages"
echo "    • get_message_history"
echo "    • get_contact_list"
echo "    • get_connection_status"
echo "    • mark_messages_read"
echo "    • get_chat_preview"
echo "    • create_group"
echo "    • set_chat_status"
echo ""
echo "📖 Full guide: 5IRE_ADVANCED_TOOLS_GUIDE.md"
echo ""
echo "✅ Setup verification complete!"
