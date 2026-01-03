# 📋 5ire Advanced WhatsApp Tools - Quick Reference

## 🚀 Quick Start (Copy & Paste)

### Terminal 1: Start Backend
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent && npm start
```

### Terminal 2: Start 5ire
```bash
/home/kapilt/Applications/5ire.appimage
```

### In 5ire: Import MCP Config
Settings → MCP Servers → Import Configuration → Paste this JSON:

```json
{
  "mcpServers": {
    "whatsapp-advanced": {
      "command": "/home/linuxbrew/.linuxbrew/bin/node",
      "args": ["/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/mcp-5ire.js"],
      "env": {
        "WHATSAPP_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

## 🛠️ 12 Advanced Tools Available

| # | Tool | Example Usage |
|----|------|---|
| 1 | `send_whatsapp_message` | "Send message to John: Hello!" |
| 2 | `get_unread_messages` | "What are my unread messages?" |
| 3 | `get_briefing` | "Summarize my messages" |
| 4 | `generate_reply_draft` | "Write a professional reply to..." |
| 5 | `search_messages` | "Search for 'project deadline'" |
| 6 | `get_message_history` | "Show me conversation with John" |
| 7 | `get_contact_list` | "List all my contacts" |
| 8 | `get_connection_status` | "Am I connected to WhatsApp?" |
| 9 | `mark_messages_read` | "Mark messages from John as read" |
| 10 | `get_chat_preview` | "Show recent chats" |
| 11 | `create_group` | "Create group 'Team' with John, Sarah" |
| 12 | `set_chat_status` | "Set status to away" |

---

## 📂 Key Files

| File | Location | Purpose |
|------|----------|---------|
| **5ire Binary** | `/home/kapilt/Applications/5ire.appimage` (214MB) | Main executable |
| **MCP Server** | `mcp-server/mcp-5ire.js` | Advanced tools (stdio transport) |
| **MCP Config** | `5ire-mcp-config.json` | Import template |
| **Backend API** | `src/server.js` | REST endpoints |
| **Setup Script** | `setup-5ire.sh` | Verification & info |
| **Full Guide** | `5IRE_ADVANCED_TOOLS_GUIDE.md` | Complete documentation |

---

## ⚡ Common Commands in 5ire

```
# Check messages
"What are my unread messages?"
"Summarize my WhatsApp briefing"
"Search for messages about meetings"

# Send messages
"Send WhatsApp to Mom: Love you!"
"Message the dev team: We're live!"
"Text John: See you at 3?"

# Create groups
"Create group 'Project Team' with john@9876543210, sarah@9876543211"
"Make a group called 'Friends' with John, Jane, Bob"

# Get history
"Show me conversation with John"
"What have I been discussing with the team?"
"List my recent chats"

# Generate replies
"Write a friendly response to 'Want to meet?'"
"Generate professional reply to customer message"
"Create a casual reply: 'Thanks for the update'"

# Manage status
"Mark all messages from John as read"
"Set my status to 'In a meeting'"
"Am I connected to WhatsApp?"
```

---

## ✅ Verification Commands

**Check backend running:**
```bash
curl http://localhost:3000/status
```

**Test MCP server:**
```bash
cd mcp-server && WHATSAPP_API_URL=http://localhost:3000 node mcp-5ire.js
```

**Check 5ire running:**
```bash
ps aux | grep 5ire
```

**View setup info:**
```bash
./setup-5ire.sh
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Tools not showing | Restart 5ire completely |
| Backend not connecting | Check: `curl http://localhost:3000/status` |
| WhatsApp disconnected | Visit: `http://localhost:3000/qr` to scan |
| MCP config import fails | Copy JSON from `5ire-mcp-config.json` |
| Node not found | Check path: `which node` |

---

## 📊 System Status

✅ **5ire**: 214MB AppImage (v0.15.2)  
✅ **MCP Server**: mcp-5ire.js (12 tools)  
✅ **Backend**: Express.js on port 3000  
✅ **Documentation**: Complete with examples  

---

## 🎯 Next Steps

1. Copy the JSON config above
2. Start backend: `npm start`
3. Start 5ire: `/home/kapilt/Applications/5ire.appimage`
4. Import config in 5ire settings
5. Start using WhatsApp tools in chat!

---

**Everything is ready to use! 🚀**
