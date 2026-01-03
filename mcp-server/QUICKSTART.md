# 🚀 QUICK START - 30 Seconds

## 1. Install & Setup
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
bash setup.sh
```

## 2. Add to Claude Config
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

## 3. Start Servers
```bash
# Terminal 1: WhatsApp Server
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start

# Terminal 2: Scan QR Code
curl http://localhost:3000/qr
```

## 4. Restart Claude Desktop

## 5. Test
In Claude: **"Show me my unread WhatsApp messages"**

---

# 💬 Quick Commands

| Say This | What Happens |
|----------|-------------|
| "Show unread messages" | Lists all unread WhatsApp |
| "Give me a briefing" | AI summary of messages |
| "Draft professional reply" | Generates business reply |
| "Draft personal reply" | Generates casual reply |
| "Send message to [number]" | Sends WhatsApp message |
| "Search messages about X" | Finds relevant messages |
| "Mark as read" | Marks messages read |
| "Is WhatsApp connected?" | Checks connection |

---

# 🐛 Troubleshooting

**Not working?**
1. ✅ WhatsApp server running? `curl http://localhost:3000/health`
2. ✅ Config path correct? Use absolute path!
3. ✅ Claude completely restarted? (Cmd+Q, not just close)
4. ✅ QR code scanned? `curl http://localhost:3000/qr`

**Check logs:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

---

# 📁 Files Created

```
mcp-server/
├── index.js                    ← MCP server (connects to Claude)
├── package.json                ← Dependencies
├── setup.sh                    ← Auto setup script
├── README.md                   ← Full documentation
├── QUICKSTART.md              ← This file!
└── claude_desktop_config.json  ← Config template
```

---

# 🎯 That's It!

You're ready to manage WhatsApp with AI! 🎉

**Next:** Read `README.md` for advanced features!
