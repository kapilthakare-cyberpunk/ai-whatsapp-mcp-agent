#!/bin/bash

# WhatsApp MCP Server Setup Script

echo "🚀 WhatsApp MCP Server Setup"
echo "=============================="
echo ""

# Get the absolute path to the MCP server
MCP_PATH="$(cd "$(dirname "$0")" && pwd)/index.js"

echo "📍 MCP Server Path: $MCP_PATH"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Make executable
chmod +x index.js
echo "✅ Made index.js executable"
echo ""

# Detect OS and show config location
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    LOG_PATH="$HOME/Library/Logs/Claude/"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
    LOG_PATH="$APPDATA/Claude/logs/"
else
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
    LOG_PATH="$HOME/.cache/Claude/logs/"
fi

echo "📝 Configuration Instructions"
echo "=============================="
echo ""
echo "1. Edit your Claude config file:"
echo "   $CONFIG_PATH"
echo ""
echo "2. Add this configuration:"
echo ""
cat << EOF
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["$MCP_PATH"],
      "env": {
        "WHATSAPP_API_URL": "http://localhost:3000"
      }
    }
  }
}
EOF
echo ""
echo "=============================="
echo ""
echo "3. Start your WhatsApp server:"
echo "   cd .."
echo "   npm start"
echo ""
echo "4. Restart Claude Desktop"
echo ""
echo "5. Test in Claude:"
echo '   "Show me my unread WhatsApp messages"'
echo ""
echo "📋 Logs location: $LOG_PATH"
echo ""
echo "✅ Setup complete! Follow the steps above to finish."
