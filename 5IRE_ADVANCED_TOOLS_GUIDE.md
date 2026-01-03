# 🚀 5ire WhatsApp Advanced Tools - Complete Guide

**Date**: 2 January 2026  
**5ire Version**: 0.15.2  
**MCP Server**: mcp-5ire.js  
**Status**: ✅ **READY TO USE**

---

## 📥 Installation

### Step 1: Download 5ire
5ire AppImage is ready at:
```
/home/kapilt/Applications/5ire.appimage
```

### Step 2: Copy MCP Configuration
The 5ire MCP configuration is ready at:
```
/home/kapilt/Projects/ai-whatsapp-mcp-agent/5ire-mcp-config.json
```

### Step 3: Import in 5ire
1. Open 5ire: `/home/kapilt/Applications/5ire.appimage`
2. Go to Settings → MCP Servers
3. Click "Import Configuration"
4. Select or paste the JSON from `5ire-mcp-config.json`
5. Click Import
6. Restart 5ire

---

## 🛠️ Available Advanced Tools

### 1. **send_whatsapp_message**
Send a WhatsApp message to any contact or group.

**Usage in 5ire:**
```
"Send message to John saying Hello, how are you?"
"Send WhatsApp to Mom: Good morning!"
"Message the dev team: Meeting at 3 PM"
```

**Parameters:**
- `to` (required): Contact name, phone number, or group name
- `message` (required): Message content

**Response:**
```json
{
  "status": "success",
  "messageId": "3A234FD...",
  "timestamp": "2026-01-02T17:20:00Z"
}
```

---

### 2. **get_unread_messages**
Retrieve all unread WhatsApp messages with sender info and timestamps.

**Usage in 5ire:**
```
"What are my unread messages?"
"Show unread WhatsApp messages"
"Get my last 10 WhatsApp messages"
```

**Parameters:**
- `limit` (optional): Max messages to retrieve (default: 20)

**Response:**
```json
{
  "status": "success",
  "count": 3,
  "messages": [
    {
      "id": "msg_123",
      "from": "John (9876543210)",
      "message": "Hey, are you free tomorrow?",
      "timestamp": "2026-01-02T15:30:00Z"
    },
    {
      "id": "msg_124",
      "from": "Work Group",
      "message": "Project deadline extended",
      "timestamp": "2026-01-02T14:15:00Z"
    }
  ]
}
```

---

### 3. **get_briefing**
Get an AI-powered briefing summarizing all unread messages.

**Usage in 5ire:**
```
"Give me a briefing of my messages"
"Summarize my unread WhatsApp messages"
"What's the executive summary of my messages?"
```

**Parameters:**
- `style` (optional): `concise` (bullet points) | `detailed` (full) | `executive` (key points)
  Default: `concise`

**Response:**
```json
{
  "status": "success",
  "style": "concise",
  "briefing": "You have 3 unread messages:\n• John asking about tomorrow\n• Work group: project deadline extended\n• Mom: just checking in"
}
```

---

### 4. **generate_reply_draft**
Generate professional or casual replies to messages.

**Usage in 5ire:**
```
"Generate a professional reply to 'Can you finish the report?'"
"Create a friendly response to 'Want to grab coffee?'"
"Write a formal reply: Hello, I wanted to follow up..."
```

**Parameters:**
- `message` (required): The message to reply to
- `tone` (required): `professional` | `casual` | `friendly` | `formal`

**Response:**
```json
{
  "status": "success",
  "originalMessage": "Can you finish the report?",
  "tone": "professional",
  "draft": "Yes, I'll have the report ready by end of day. Thanks for checking in.",
  "alternatives": [
    "I'm on it - should be done by 5 PM.",
    "Absolutely. I'm wrapping it up now."
  ]
}
```

---

### 5. **search_messages**
Search through all messages by keyword or topic.

**Usage in 5ire:**
```
"Search for messages about the project"
"Find messages mentioning 'meeting'"
"Search WhatsApp for 'deadline'"
```

**Parameters:**
- `keyword` (required): Search term
- `limit` (optional): Max results (default: 10)

**Response:**
```json
{
  "status": "success",
  "keyword": "project",
  "count": 2,
  "messages": [
    {
      "id": "msg_001",
      "from": "Team Lead",
      "message": "Project deadline extended to Friday",
      "timestamp": "2026-01-02T14:15:00Z"
    },
    {
      "id": "msg_002",
      "from": "John",
      "message": "How's the project going?",
      "timestamp": "2026-01-02T13:45:00Z"
    }
  ]
}
```

---

### 6. **get_message_history**
Get full conversation history with a specific contact.

**Usage in 5ire:**
```
"Show me conversation history with John"
"Get last 30 messages from Mom"
"What have I been discussing with the dev team?"
```

**Parameters:**
- `contact` (required): Contact name or phone number
- `limit` (optional): Number of recent messages (default: 20)

**Response:**
```json
{
  "status": "success",
  "contact": "John",
  "count": 15,
  "messages": [
    {
      "id": "msg_100",
      "from": "John",
      "message": "Sounds good!",
      "timestamp": "2026-01-02T16:45:00Z"
    },
    {
      "id": "msg_099",
      "from": "You",
      "message": "Let's meet at 3 PM",
      "timestamp": "2026-01-02T16:40:00Z"
    }
  ]
}
```

---

### 7. **get_contact_list**
Retrieve list of all contacts with their status.

**Usage in 5ire:**
```
"Show me all my contacts"
"List WhatsApp contacts named 'John'"
"Who are my online contacts?"
```

**Parameters:**
- `filter` (optional): Filter by name or online status

**Response:**
```json
{
  "status": "success",
  "count": 45,
  "contacts": [
    {
      "id": "9876543210@s.whatsapp.net",
      "name": "John",
      "isGroup": false,
      "unread": 0,
      "lastMessage": "2026-01-02T16:45:00Z"
    },
    {
      "id": "dev-team@g.us",
      "name": "Dev Team",
      "isGroup": true,
      "unread": 2,
      "lastMessage": "2026-01-02T15:30:00Z"
    }
  ]
}
```

---

### 8. **get_connection_status**
Check WhatsApp connection status and availability.

**Usage in 5ire:**
```
"Am I connected to WhatsApp?"
"Check WhatsApp status"
"Is my WhatsApp active?"
```

**Parameters:**
(none)

**Response:**
```json
{
  "status": "connected",
  "timestamp": "2026-01-02T17:18:45Z"
}
```

---

### 9. **mark_messages_read**
Mark all unread messages from a contact as read.

**Usage in 5ire:**
```
"Mark messages from John as read"
"Clear unread messages from the dev team"
"Mark all messages from Mom as read"
```

**Parameters:**
- `contact` (required): Contact or group name
- `all` (optional): Mark all messages (default: true)

**Response:**
```json
{
  "status": "success",
  "message": "Marked messages from John as read",
  "count": 3
}
```

---

### 10. **get_chat_preview**
Get preview of recent chats with last message and info.

**Usage in 5ire:**
```
"Show me my recent chats"
"What are my recent conversations?"
"List my last 15 chats"
```

**Parameters:**
- `limit` (optional): Number of chats to preview (default: 10)

**Response:**
```json
{
  "status": "success",
  "count": 5,
  "chats": [
    {
      "id": "john@s.whatsapp.net",
      "name": "John",
      "lastMessage": "See you tomorrow!",
      "timestamp": "2026-01-02T16:45:00Z",
      "unread": 1
    },
    {
      "id": "dev-team@g.us",
      "name": "Dev Team",
      "lastMessage": "Meeting moved to 3 PM",
      "timestamp": "2026-01-02T15:30:00Z",
      "unread": 0
    }
  ]
}
```

---

### 11. **create_group**
Create a new WhatsApp group with multiple members.

**Usage in 5ire:**
```
"Create a group called 'Project Team' with John, Sarah, and Mike"
"Make a new WhatsApp group named 'Monthly Sync' with contacts: john@9876543210, sarah@9876543211"
"Create group 'Friends' with John, Jane, and Bob"
```

**Parameters:**
- `groupName` (required): Name for the new group
- `members` (required): Array of contact names or phone numbers

**Response:**
```json
{
  "status": "success",
  "message": "Group created successfully",
  "groupId": "group-id-12345@g.us",
  "groupName": "Project Team",
  "memberCount": 3
}
```

---

### 12. **set_chat_status**
Set your WhatsApp status (online/away/offline/DND).

**Usage in 5ire:**
```
"Set my status to away"
"Mark me as do not disturb"
"Set status to offline"
"Set status online with message 'In a meeting'"
```

**Parameters:**
- `status` (required): `online` | `away` | `offline` | `dnd` (Do Not Disturb)
- `message` (optional): Status message

**Response:**
```json
{
  "status": "success",
  "message": "Status updated to away"
}
```

---

## 📊 Configuration

### 5ire MCP Server Config
**Location**: `~/.config/5ire/mcp.json`

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

## 🚀 Quick Start

### 1. Start WhatsApp Backend
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start
```

### 2. Start 5ire
```bash
/home/kapilt/Applications/5ire.appimage
```

### 3. Use in Chat
In 5ire chat:
```
"What are my unread messages?"
"Search for emails about the project"
"Create a group called 'Planning' with John and Sarah"
"Generate a professional reply to my last message from John"
```

---

## 💡 Example Workflows

### Morning Briefing
```
User: "Good morning, give me a briefing of my messages"
5ire: [Uses get_briefing] → Returns concise summary of overnight messages
```

### Quick Reply
```
User: "I got a message from John saying 'Can we meet tomorrow?' - write a friendly response"
5ire: [Uses generate_reply_draft with tone='friendly']
→ Suggests: "Sure! How about 2 PM at the coffee place?"
```

### Message Search
```
User: "Find all messages about the Q1 planning"
5ire: [Uses search_messages]
→ Returns 5 relevant messages from various contacts
```

### Group Creation
```
User: "Create a new group called 'Product Launch' with john@9876543210, sarah@9876543211, and mike@9876543212"
5ire: [Uses create_group]
→ Group created with 3 members
```

---

## ⚙️ Backend Endpoints (Advanced)

All tools use these backend REST endpoints:

| Tool | Endpoint | Method |
|------|----------|--------|
| send_whatsapp_message | `/send` | POST |
| get_unread_messages | `/messages` | GET |
| get_briefing | `/briefing` | POST |
| generate_reply_draft | `/draft` | POST |
| search_messages | `/search` | GET |
| get_message_history | `/history/{contact}` | GET |
| get_contact_list | `/contacts` | GET |
| get_connection_status | `/status` | GET |
| mark_messages_read | `/mark-read` | POST |
| get_chat_preview | `/chats` | GET |
| create_group | `/create-group` | POST |
| set_chat_status | `/status` | POST |

---

## 🔧 Troubleshooting

### Tools Not Appearing in 5ire
1. Ensure WhatsApp backend is running: `curl http://localhost:3000/status`
2. Restart 5ire completely
3. Check 5ire MCP config at `~/.config/5ire/mcp.json`
4. Verify node path: `which node`

### Messages Not Retrieving
1. WhatsApp backend must be connected: `curl http://localhost:3000/status`
2. Scan QR code if disconnected: `curl http://localhost:3000/qr`
3. Check for message store issues

### Group Creation Fails
1. Verify all phone numbers are correct
2. Ensure contacts exist in WhatsApp
3. Check connection status

---

## 📝 File Locations

| File | Location | Purpose |
|------|----------|---------|
| 5ire AppImage | `/home/kapilt/Applications/5ire.appimage` | Main executable |
| MCP Server | `/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/mcp-5ire.js` | Tool definitions |
| MCP Config | `/home/kapilt/Projects/ai-whatsapp-mcp-agent/5ire-mcp-config.json` | Import template |
| Backend | `/home/kapilt/Projects/ai-whatsapp-mcp-agent/src/server.js` | REST API |
| 5ire Config | `~/.config/5ire/mcp.json` | Active MCP server config |

---

## ✅ Verification

### Check Backend is Running
```bash
curl http://localhost:3000/status
# Expected: {"status":"connected",...}
```

### Check MCP Server
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
WHATSAPP_API_URL=http://localhost:3000 node mcp-5ire.js
# Should start without errors
```

### Check 5ire
```bash
ps aux | grep 5ire
# Should see 5ire process running
```

---

## 🎯 What's Next

1. **Open 5ire** → `/home/kapilt/Applications/5ire.appimage`
2. **Import MCP Config** → Settings → MCP Servers → Import
3. **Paste JSON** → Content from `5ire-mcp-config.json`
4. **Restart 5ire** → Full restart
5. **Use Tools** → Start chatting with WhatsApp capabilities!

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: 2 January 2026  
**Version**: 1.0  
**All 12 Tools Available**

