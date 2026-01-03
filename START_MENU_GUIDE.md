# 🚀 WhatsApp MCP Start Menu Guide

**File**: `start-menu.sh`  
**Status**: ✅ Ready to use  
**Version**: 1.0

---

## Quick Start

```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
./start-menu.sh
```

---

## Menu Options

### 1️⃣ Start WhatsApp MCP Stdio Server (for 5ire)
**Command**: Option `1`

- **Uses**: `mcp-server/mcp-5ire.js`
- **Transport**: stdio
- **For**: 5ire AI Assistant integration
- **Features**: 12 advanced WhatsApp tools
- **Backend**: Automatically starts backend if not running

**When to use**: When connecting 5ire to WhatsApp MCP

---

### 2️⃣ Start WhatsApp MCP Server Node (for Claude Desktop)
**Command**: Option `2`

- **Uses**: `mcp-server/index.js`
- **Transport**: stdio
- **For**: Claude Desktop integration
- **Features**: 5 core WhatsApp tools
- **Backend**: Automatically starts backend if not running

**When to use**: When connecting Claude Desktop to WhatsApp MCP

---

### 3️⃣ Start Backend Server Only (Port 3000)
**Command**: Option `3`

- **Uses**: `src/server.js`
- **Port**: 3000
- **For**: REST API access only
- **Features**: All backend endpoints
- **No MCP**: Just the backend

**When to use**: When you only need the WhatsApp API

**Available Endpoints**:
- `/status` - Connection status
- `/health` - Health check
- `/qr` - Get QR code for WhatsApp
- `/messages` - Get unread messages
- `/send` - Send a message (POST)
- `/briefing` - Get AI briefing (POST)
- `/draft` - Generate reply (POST)
- `/search` - Search messages
- `/history/{contact}` - Get conversation history
- `/contacts` - List all contacts
- `/chats` - Get recent chats
- `/create-group` - Create WhatsApp group (POST)

---

### 4️⃣ Start All (Backend + 5ire MCP Server)
**Command**: Option `4`

- **Starts**: Backend + MCP Stdio Server
- **For**: Complete 5ire setup
- **Features**: Everything ready to use
- **Logging**: Both processes logged to `logs/`

**When to use**: First time setup or full system test

---

### 0️⃣ Exit
**Command**: Option `0`

Closes the menu and exits.

---

## File Locations

```
/home/kapilt/Projects/ai-whatsapp-mcp-agent/
├── start-menu.sh ..................... This menu script (NEW!)
├── src/server.js ..................... Backend server
├── mcp-server/
│   ├── mcp-5ire.js ................... 5ire MCP server
│   └── index.js ...................... Claude Desktop MCP server
└── logs/ ............................. Log files (created on demand)
```

---

## Log Files

When running services, logs are saved to:

```
logs/
├── backend.log ...................... Backend server logs
└── mcp-5ire.log ..................... MCP server logs
```

View in real-time:
```bash
tail -f logs/backend.log
tail -f logs/mcp-5ire.log
```

---

## Common Workflows

### Setup 5ire WhatsApp Integration
```bash
./start-menu.sh
# Choose: 4 (Start All)
# Then in 5ire: Settings → MCP Servers → Import Configuration
```

### Use With Claude Desktop
```bash
./start-menu.sh
# Choose: 2 (Start Claude MCP Server)
# Configure Claude Desktop with this MCP server
```

### Just Start Backend API
```bash
./start-menu.sh
# Choose: 3 (Start Backend Only)
# Use curl or apps to access http://localhost:3000
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Start 5ire MCP Server |
| `2` | Start Claude Desktop MCP Server |
| `3` | Start Backend Only |
| `4` | Start All Services |
| `0` | Exit |
| `Ctrl+C` | Stop current service |

---

## Troubleshooting

### Port 3000 Already in Use
The menu automatically kills any process on port 3000 before starting.

### Backend Won't Start
1. Check logs: `tail -f logs/backend.log`
2. Verify Node.js: `node --version`
3. Install dependencies: `npm install`

### MCP Server Won't Start
1. Ensure backend is running first
2. Check logs: `tail -f logs/mcp-5ire.log`
3. Verify node path: `which node`

### Can't See Menu
Make script executable:
```bash
chmod +x start-menu.sh
```

---

## Features

✅ **Interactive Menu** - Easy selection of services  
✅ **Auto-cleanup** - Kills existing processes on ports  
✅ **Auto-backend** - Starts backend if needed  
✅ **Logging** - All output logged to files  
✅ **Color Output** - Easy to read with colors  
✅ **Responsive** - Waits for services to be ready  

---

## Alternative Direct Commands

If you prefer command-line:

```bash
# Start 5ire MCP Server directly
cd mcp-server && WHATSAPP_API_URL=http://localhost:3000 node mcp-5ire.js

# Start Claude MCP Server directly
cd mcp-server && WHATSAPP_API_URL=http://localhost:3000 node index.js

# Start backend directly
npm start

# Start all (in separate terminals)
npm start &  # Terminal 1
./mcp-server/mcp-5ire.js  # Terminal 2
```

---

## Tips & Tricks

### Keep Logs Open While Running
In one terminal:
```bash
./start-menu.sh
# Choose option 4
```

In another terminal:
```bash
tail -f logs/backend.log
tail -f logs/mcp-5ire.log
```

### Quick Backend Test
```bash
./start-menu.sh
# Choose option 3
curl http://localhost:3000/status
```

### Development Workflow
```bash
./start-menu.sh
# Choose option 4 (Start All)
# Edit code in IDE
# Restart menu if needed (services reload)
```

---

## Summary

| Option | Use Case | Tools |
|--------|----------|-------|
| **1** | 5ire setup | 12 tools |
| **2** | Claude Desktop | 5 tools |
| **3** | Backend API | REST endpoints |
| **4** | Full setup | Everything |

---

**Last Updated**: 2 January 2026  
**Status**: ✅ Production Ready  
**Created**: AI Assistant  

🚀 Enjoy your WhatsApp MCP servers!
