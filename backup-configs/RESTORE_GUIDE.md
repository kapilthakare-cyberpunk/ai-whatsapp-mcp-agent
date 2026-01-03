# 🚀 WhatsApp MCP Agent - Complete Setup Guide
## Last Updated: 2 January 2026

## 📋 Current Status
- ✅ WhatsApp Backend: Running on port 3000
- ✅ MCP Server: Running and tested
- ✅ Claude Desktop: Configured and restarted
- ✅ WhatsApp Connection: Connected to WhatsApp Web

## 🔧 Quick Restore Commands

### 1. Start WhatsApp Backend
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start
```

### 2. Start MCP Server
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
npm start
```

### 3. Restore Claude Desktop Config
```bash
cp /home/kapilt/Projects/ai-whatsapp-mcp-agent/backup-configs/claude_desktop_config.json.backup ~/.config/Claude/claude_desktop_config.json
pkill -f claude-desktop && sleep 2 && nohup claude-desktop > /dev/null 2>&1 &
```

## 📁 File Structure
```
backup-configs/
├── claude_desktop_config.json.backup    # Claude Desktop MCP config
├── mcp-server-package.json              # MCP server dependencies
├── main-package.json                    # Main project dependencies
├── claude_desktop_config.json           # Local MCP server config
└── .env                                 # Environment variables (if exists)
```

## ⚙️ Configuration Details

### Claude Desktop Config (~/.config/Claude/claude_desktop_config.json)
```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/index.js"],
      "env": {"WHATSAPP_API_URL": "http://localhost:3000"}
    }
  }
}
```
### 5ire Config (~/.config/5ire/mcp.json)
```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/index.js"],
      "env": {
        "WHATSAPP_API_URL": "http://localhost:3000"
      }
    }
  }
}
```
### MCP Server Config (mcp-server/package.json)
- **Type**: "commonjs" (NOT "module")
- **Main**: "index.js"
- **Start Command**: `node index.js`

### Main Project Config (package.json)
- **Main**: "src/server.js"
- **Start Command**: `node src/server.js`
- **Port**: 3000 (configured in config/config.js)

## 🧪 Testing

### Test MCP Server
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
node test-mcp.js
```

### Check WhatsApp Status
```bash
curl http://localhost:3000/status
# Should return: {"status": "connected", "timestamp": "..."}
```

### Check MCP Tools
The MCP server provides these tools:
- `get_unread_messages` - Get unread WhatsApp messages
- `get_briefing` - AI summary of unread messages
- `send_whatsapp_message` - Send messages
- `generate_reply_draft` - Generate AI replies
- `get_connection_status` - Check WhatsApp connection

## 🚨 Troubleshooting

### If WhatsApp Disconnects
1. Check status: `curl http://localhost:3000/status`
2. If not connected: `curl http://localhost:3000/qr`
3. Scan QR code with WhatsApp Web

### If MCP Server Fails
1. Check package.json type is "commonjs"
2. Verify node version: `node --version`
3. Check dependencies: `npm install` in mcp-server/

### If Claude Desktop Doesn't See Server
1. Restart Claude Desktop
2. Check config path is correct
3. Verify MCP server is running

## 📝 Environment Variables
- `WHATSAPP_API_URL`: http://localhost:3000 (for MCP server)
- `PORT`: 3000 (for main server, in config/config.js)

## 🔄 Process IDs to Monitor
- WhatsApp Backend: Check `ps aux | grep "node src/server.js"`
- MCP Server: Check `ps aux | grep "node index.js"` (in mcp-server/)

## 💾 Backup Commands
```bash
# Create fresh backup
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
mkdir -p backup-configs
cp ~/.config/Claude/claude_desktop_config.json backup-configs/claude_desktop_config.json.backup
cp mcp-server/claude_desktop_config.json backup-configs/
cp mcp-server/package.json backup-configs/mcp-server-package.json
cp package.json backup-configs/main-package.json
cp .env backup-configs/ 2>/dev/null || true
```

## 🎯 Usage in Claude Desktop
Once everything is running, you can ask Claude:
- "Check my WhatsApp messages"
- "Send a WhatsApp message to [contact] saying [message]"
- "Generate a professional reply to this message: [paste message]"
- "Get briefing of my unread WhatsApp messages"

## 🔐 Security Notes
- WhatsApp Web session is stored locally
- MCP server runs locally on your machine
- No external APIs required for basic functionality
- AI features may require API keys (check .env file)

---
**Save this file and the backup-configs/ directory!** 📁