# WhatsApp Communication Manager - MCP Server

Connect your WhatsApp to 5ire app (Claude Desktop) for AI-powered communication management.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd mcp-server
npm install
```

### 2. Make Executable
```bash
chmod +x index.js
```

### 3. Configure 5ire App

Add this to your 5ire config file:

**For Claude Desktop:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

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

### 4. Start Your WhatsApp Server
```bash
# In the main project directory
npm start
```

### 4b. ChatGPT Web MCP (SSE)
If you want to connect from the ChatGPT "Custom Tool" MCP UI, run the MCP server in SSE mode:

```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
TRANSPORT=sse PORT=3001 node index.js
```

Use this MCP Server URL in ChatGPT:
```
http://YOUR_HOST:3001/sse
```

If ChatGPT is running in the browser, `YOUR_HOST` must be reachable from the internet (use a tunnel like Cloudflare or ngrok).

### 5. Restart 5ire App

Close and reopen Claude Desktop / 5ire app to load the MCP server.

---

## 📱 Usage in 5ire App

Once connected, you can ask Claude:

### Get Unread Messages
```
"Show me my unread WhatsApp messages"
"What messages do I have?"
```

### Get AI Briefing
```
"Give me a briefing of my WhatsApp messages"
"Summarize my unread messages"
```

### Send Messages
```
"Send a WhatsApp message to 919876543210@s.whatsapp.net saying 'Meeting confirmed for 3 PM'"
```

### Generate Reply Drafts
```
"Generate a professional reply for this message: 'Can we schedule a meeting?'"
"Draft a personal response to: 'Hey, how are you?'"
```

### Check Connection
```
"Is WhatsApp connected?"
"Check WhatsApp connection status"
```

---

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `get_unread_messages` | Fetch all unread messages with sender info |
| `get_briefing` | AI-powered summary of unread messages |
| `send_whatsapp_message` | Send message to any contact |
| `generate_reply_draft` | Generate professional/personal replies |
| `get_connection_status` | Check WhatsApp connection |

---

## 🔧 Configuration

### Environment Variables

Create `.env` in mcp-server directory:

```bash
WHATSAPP_API_URL=http://localhost:3000
```

### Custom Port

If your WhatsApp server runs on a different port:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["/full/path/to/mcp-server/index.js"],
      "env": {
        "WHATSAPP_API_URL": "http://localhost:YOUR_PORT"
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### MCP Server Not Showing in 5ire
1. Check config file path is correct
2. Use absolute paths, not relative
3. Restart 5ire app completely
4. Check logs: `~/Library/Logs/Claude/` (macOS)

### Connection Errors
1. Ensure WhatsApp server is running: `npm start`
2. Check port 3000 is not blocked
3. Test API: `curl http://localhost:3000/health`

### No Messages Showing
1. Scan WhatsApp QR code first
2. Check connection: Ask Claude "Is WhatsApp connected?"
3. Send yourself a test message

---

## 📋 Complete Example

1. **Start WhatsApp Server:**
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start
```

2. **Configure 5ire** (see step 3 above)

3. **Test in Claude:**
```
You: "Show me my unread messages"

Claude: Here are your unread messages:
- From: John Doe
  Message: "Can we meet tomorrow?"
  Priority: high

- From: Jane Smith
  Message: "Thanks for the update!"
  Priority: normal
```

4. **Generate Reply:**
```
You: "Generate a professional reply to John's message"

Claude: Here's a professional draft:

"Hello John,

Thank you for reaching out. I'd be happy to meet tomorrow. 
What time works best for you?

Best regards"

Confidence: 92%
```

5. **Send Message:**
```
You: "Send that reply to 919876543210@s.whatsapp.net"

Claude: ✅ Message sent successfully!
```

---

## 🎯 Pro Tips

1. **Morning Routine**: "Give me a briefing of messages"
2. **Quick Replies**: "Draft a professional response to the last urgent message"
3. **Batch Actions**: "Show all messages from John and mark them as read"
4. **Context-Aware**: "Based on my conversation history with Jane, draft a reply"

---

## 📞 Support

If you encounter issues:

1. Check both servers are running:
   - WhatsApp server: `http://localhost:3000/health`
   - MCP server: Should show in 5ire MCP list

2. View logs:
   - WhatsApp server logs in terminal
   - MCP logs in `~/Library/Logs/Claude/mcp*.log`

3. Test individual tools:
   ```bash
   curl http://localhost:3000/unread
   curl http://localhost:3000/status
   ```

---

## 🚀 Next Steps

1. ✅ Install and configure
2. ✅ Scan WhatsApp QR code
3. ✅ Test with "Show me unread messages"
4. ✅ Try generating reply drafts
5. ✅ Explore other tools!

Enjoy AI-powered WhatsApp management! 🎉
