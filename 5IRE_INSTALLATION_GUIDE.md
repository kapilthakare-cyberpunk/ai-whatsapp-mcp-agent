# 🚀 5ire Installation Guide - Fresh Build from Source

## ✅ Complete! Fresh 5ire Built Successfully

Date: 2 January 2026

### 📋 What Was Done

1. **Uninstalled old 5ire AppImage** ✅
2. **Cleared all 5ire cache and config** ✅
3. **Built fresh 5ire from source** ✅
4. **Installed WhatsApp MCP server** ✅

---

## 📁 Files Location

### Fresh 5ire Build
- **Path**: `/home/kapilt/Applications/5ire.appimage` (197 MB)
- **Source**: Built from `/tmp/5ire-source` (GitHub repo)
- **Version**: 0.15.0
- **Status**: ✅ Running and tested

### Backup Copy
- **Path**: `/home/kapilt/Projects/ai-whatsapp-mcp-agent/backup-configs/5ire-0.15.0-x86_64.AppImage.backup`
- **Size**: 197 MB
- **Purpose**: Emergency restore

---

## 🔧 How to Rebuild 5ire (if needed)

### Quick Method - From Backup
```bash
# If 5ire breaks, use the backup
cp /home/kapilt/Projects/ai-whatsapp-mcp-agent/backup-configs/5ire-0.15.0-x86_64.AppImage.backup \
   /home/kapilt/Applications/5ire.appimage
chmod +x /home/kapilt/Applications/5ire.appimage
```

### Full Build Method - From Source
```bash
# Clone the repository
cd /tmp
git clone --depth 1 https://github.com/nanbingxyz/5ire.git 5ire-source
cd 5ire-source

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env

# Build the application
npm run build

# Package into AppImage (this takes ~5 minutes)
npm run package

# Copy the result
cp release/5ire-0.15.0-x86_64.AppImage /home/kapilt/Applications/5ire.appimage
chmod +x /home/kapilt/Applications/5ire.appimage
```

---

## 🎯 WhatsApp MCP Configuration in 5ire

### Step 1: Launch 5ire
```bash
/home/kapilt/Applications/5ire.appimage
```

### Step 2: Open Settings
- Click the **⚙️ gear icon** in the top right
- Or press **Ctrl + ,**

### Step 3: Find MCP Servers Section
- Look for **"Tools"** or **"MCP Servers"** tab
- Or **"Integrations"** section

### Step 4: Add WhatsApp MCP Server
- Click **"Add MCP Server"** button
- Or click **"+"** icon

**Enter these settings:**

| Field | Value |
|-------|-------|
| **Name/Label** | `WhatsApp MCP` |
| **Command** | `/home/linuxbrew/.linuxbrew/bin/node` |
| **Arguments** | `/home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server/mcp-stdio.js` |
| **Working Directory** | `/home/kapilt/Projects/ai-whatsapp-mcp-agent` |
| **Environment Variable** | `WHATSAPP_API_URL=http://localhost:3000` |

### Step 5: Save and Connect
- Click **Save** or **Connect**
- Wait for status to show **Connected** ✅

### Step 6: Test the Tools
In 5ire chat, ask:
```
Check my WhatsApp messages
```

Expected response:
```
Found X unread messages:
1. From: [Contact Name]
   Message: [Message text]
   Time: [Date/Time]
```

---

## 🔌 Running the Full System

### Terminal 1: Start WhatsApp Backend
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start
```

Expected output:
```
Server running on port 3000
WhatsApp connection active
```

### Terminal 2: Start 5ire
```bash
/home/kapilt/Applications/5ire.appimage
```

Wait 10-15 seconds for it to fully load.

### Terminal 3 (Optional): Monitor Logs
```bash
tail -f ~/.config/5ire/Logs/main.log
```

---

## ✅ Verification Checklist

- [ ] WhatsApp Backend running on port 3000
- [ ] 5ire application window visible
- [ ] MCP Server connected in 5ire
- [ ] WhatsApp tools appear in chat interface
- [ ] Can send test message via WhatsApp tool
- [ ] Can check unread messages
- [ ] Can get AI briefing of messages

---

## 🧪 Testing Commands

### Test WhatsApp Backend
```bash
curl -s http://localhost:3000/status
# Expected: {"status":"connected","timestamp":"..."}
```

### Test MCP Server
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
WHATSAPP_API_URL=http://localhost:3000 node mcp-stdio.js
# Should start without errors
```

### List Available Tools
```bash
curl -s http://localhost:3000/unread?limit=5 | jq .
# Shows unread messages
```

---

## 🚨 Troubleshooting

### 5ire Won't Start
```bash
# Clear cache and restart
rm -rf ~/.config/5ire
/home/kapilt/Applications/5ire.appimage
```

### WhatsApp Disconnected
```bash
# Check status
curl http://localhost:3000/status

# If not connected, scan QR code
curl http://localhost:3000/qr
```

### MCP Tools Not Appearing
1. Close 5ire completely: `pkill -9 -f 5ire`
2. Restart 5ire: `/home/kapilt/Applications/5ire.appimage`
3. Wait 15 seconds for MCP to connect
4. Try asking: "Check my WhatsApp messages"

### WhatsApp Backend Port 3000 Busy
```bash
# Kill process using port 3000
lsof -i :3000
kill -9 [PID]

# Then restart
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent && npm start
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────┐
│         5ire GUI Interface          │
│     (MCP Client)                    │
└──────────────┬──────────────────────┘
               │
               │ stdio
               ▼
┌─────────────────────────────────────┐
│   WhatsApp MCP Server               │
│ (mcp-stdio.js - CommonJS)           │
│ Port: stdio (via process)           │
└──────────────┬──────────────────────┘
               │
               │ HTTP API
               ▼
┌─────────────────────────────────────┐
│   WhatsApp Backend Server           │
│ (Express.js)                        │
│ Port: 3000                          │
└──────────────┬──────────────────────┘
               │
               ▼
        WhatsApp Web API
        (Baileys)
```

---

## 📝 Key Information

- **5ire Version**: 0.15.0
- **Node Version**: v25.2.1
- **WhatsApp Backend**: Express.js on port 3000
- **MCP Server**: stdio transport (CommonJS)
- **WhatsApp Session**: Stored in `/home/kapilt/.config/5ire` or project directory

---

## 🔐 Database Notes

5ire uses PostgreSQL locally with Drizzle ORM. First run will:
1. Create tables automatically ✅
2. Run migrations automatically ✅
3. Initialize embeddings (skip if model not found - OK) ⚠️

You don't need to manage the database manually.

---

## 💾 Backup Strategy

All critical files are backed up in:
```
/home/kapilt/Projects/ai-whatsapp-mcp-agent/backup-configs/
```

Including:
- Fresh 5ire AppImage (197 MB)
- MCP server configuration
- Claude Desktop config
- Complete restoration scripts

---

**Last Updated**: 2 January 2026
**Status**: ✅ Production Ready