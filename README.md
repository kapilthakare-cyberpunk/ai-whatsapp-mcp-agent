# WhatsApp MCP Server

A comprehensive WhatsApp Message Control Protocol (MCP) server that integrates with WhatsApp Web using Baileys to handle incoming messages, provide AI-powered responses, and manage tasks automatically.

## Overview

This server acts as a bridge between WhatsApp Web and your MCP system using the Baileys library. It connects to WhatsApp through the WhatsApp Web protocol, receives messages, processes them with AI, automatically detects tasks, and makes them available for MCP workflows. It also provides capabilities to send messages back to WhatsApp users with intelligent response generation.

## Key Features

### 🤖 AI-Powered Response Generation
- **Dual-tone AI Responses**: Generate professional or personal responses with a single click
- **Context-aware replies**: AI considers conversation history for more accurate responses
- **Multiple AI providers**: Supports Groq, Gemini, and Ollama for maximum reliability
- **Ready-to-send drafts**: AI generates responses that are ready to send without editing

### 📋 Task Management & Automation
- **Automatic Task Detection**: AI detects tasks from incoming messages and extracts deadlines/priorities
- **Todoist Integration**: Automatically add detected tasks to your Todoist account
- **Task Categories**: Categorize tasks as work, personal, shopping, or communication
- **Priority Detection**: Automatically detect urgent tasks based on keywords and context

### 📊 Message Monitoring & Analytics
- **Real-time Monitoring**: Track all incoming and outgoing messages
- **Priority Classification**: Automatic detection of urgent messages
- **Message Categorization**: Sort by type (text, image, video, etc.)
- **Comprehensive Statistics**: Monitor message volume, trends, and patterns
- **Unread Message Management**: Track and manage unread conversations

### 🎨 Template System
- **Variable-based Templates**: Create templates with fill-in variables
- **Categorization**: Organize templates by business, personal, inquiry, etc.
- **Usage Tracking**: Monitor which templates are used most frequently
- **Quick Search**: Find templates by name, content, or tags
- **Default Templates**: Comes with pre-built templates for common scenarios

### 📱 User Experience
- **Modern Dashboard**: React-based frontend with real-time updates
- **Audio Notifications**: Sound alerts for new messages (toggle on/off)
- **Thread-based Organization**: Group messages by conversation
- **Quick Actions**: Generate responses with two simple buttons (Professional/Personal)
- **Full History View**: Access complete conversation history

### 🧠 Intelligence Features
- **AI Briefing**: Get comprehensive summaries of all unread messages
- **Urgency Detection**: Identify urgent messages based on keywords and patterns
- **Conversation Context**: Maintain conversation history for better AI responses
- **User Preference Learning**: Track conversation patterns and preferences
- **Multi-language Support**: Works with English, Hindi, and other languages

### 🔗 Integration Capabilities
- **WhatsApp Web API**: Full integration with WhatsApp Web protocol
- **Todoist API**: Task management integration
- **MCP Protocol**: Ready for MCP workflow integration
- **Multiple AI APIs**: Flexible AI provider support

## Prerequisites

- Node.js (v14 or higher)
- A WhatsApp account on your phone
- API keys for AI services (optional - fallbacks available):
  - GROQ_API_KEY (recommended for best performance)
  - GEMINI_API_KEY (alternative option)
  - Ollama (local option - requires installation)
- Todoist API key for task management (optional)

## Installation

1. Clone this repository or navigate to the project directory:
   ```bash
   cd /Users/kapilthakare/Projects/whatsapp-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` to configure your AI API keys and other settings:
   ```bash
   # AI API Keys (at least one required for full functionality)
   GROQ_API_KEY=your_groq_api_key
   GEMINI_API_KEY=your_gemini_api_key
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2

   # Todoist Integration (optional)
   TODOIST_API_KEY=your_todoist_api_key

   # Server Configuration
   PORT=3000
   ```

## Running the Server

### Guided Full Startup (QR + Tunnel)

```bash
./scripts/configure-and-run.sh
```

This will:
- Start the backend and print the WhatsApp QR in the terminal
- Wait for login, then start the dashboard and MCP SSE server
- Optionally launch a Cloudflare tunnel

### Development Mode

```bash
npm run dev
```

This uses nodemon to restart the server automatically when changes are detected.

### Production Mode

```bash
npm start
```

### Frontend Dashboard

To run the React-based dashboard:

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`

## Authentication

The server authenticates with WhatsApp Web using a QR code:

1. Start the server
2. Visit the `/qr` endpoint to get a QR code (or check the server console)
3. Open WhatsApp on your phone
4. Go to Settings > Linked Devices > Link a Device
5. Scan the QR code displayed in the console or returned by the API
6. Once authenticated, the connection will persist in the `baileys_store_multi` directory

## API Endpoints

### WhatsApp Integration
- `GET  /qr`     - Get QR code for WhatsApp Web authentication
- `GET  /status` - Get current connection status
- `POST /send`   - Send a message to a WhatsApp contact
- `GET  /health` - Health check endpoint

### AI Response Generation
- `POST /process-ai` - Generate AI response with professional/personal tone
- `POST /drafts` - Generate multiple draft responses (deprecated in favor of process-ai)
- `GET  /briefing` - Get AI-generated briefing of unread messages

### Message Monitoring
- `GET  /monitored-messages` - Get all monitored messages
- `GET  /monitored-messages/type/:type` - Get messages by type (text, image, etc.)
- `GET  /monitored-messages/user/:userId` - Get messages by specific user
- `GET  /monitored-messages/group/:groupId` - Get messages by group
- `GET  /monitoring-stats` - Get monitoring statistics
- `GET  /unread` - Get unread messages
- `POST /mark-read` - Mark messages as read

### Conversation Context
- `GET  /context/:userId` - Get conversation context for AI processing
- `GET  /history/:userId` - Get full conversation history
- `GET  /summary/:userId` - Get conversation summary
- `GET  /preferences/:userId` - Get user preferences

### Templates
- `GET    /templates` - Get all templates
- `GET    /templates/:id` - Get specific template
- `POST   /templates` - Create new template
- `PUT    /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST   /templates/:id/use` - Use template (fill variables and track usage)
- `GET    /templates/category/:category` - Get templates by category
- `GET    /templates/search?q=term` - Search templates
- `GET    /templates/most-used` - Get most used templates
- `GET    /templates/recent` - Get recently used templates
- `GET    /templates/stats` - Get template statistics
- `GET    /templates-categories` - Get all template categories

### Task Management
- `POST /tasks/detect` - Detect tasks from a message
- `POST /tasks/todoist/add` - Add task to Todoist
- `GET  /tasks/todoist/projects` - Get Todoist projects
- `GET  /tasks/todoist/today` - Get today's tasks from Todoist
- `POST /tasks/todoist/:taskId/complete` - Complete task in Todoist
- `GET  /tasks/detected` - Get auto-detected tasks
- `GET  /tasks/detected/sender/:senderId` - Get tasks by sender

## Usage Examples

### Get QR Code for Authentication
```bash
curl http://localhost:3000/qr
```

### Check Connection Status
```bash
curl http://localhost:3000/status
```

### Send a Message
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "phonenumber@s.whatsapp.net",
    "message": "Hello from MCP server!"
  }'
```

### Generate AI Response (Professional Tone)
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "919876543210@s.whatsapp.net",
    "message": "Can we schedule a meeting next week?",
    "tone": "professional"
  }'
```

### Generate AI Response (Personal Tone)
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "919876543210@s.whatsapp.net",
    "message": "Hey, how are you doing?",
    "tone": "personal"
  }'
```

### Get Unread Messages
```bash
curl http://localhost:3000/unread
```

### Mark Messages as Read
```bash
curl -X POST http://localhost:3000/mark-read \
  -H "Content-Type: application/json" \
  -d '{
    "messageIds": ["message1", "message2", "message3"]
  }'
```

### Get AI Briefing of Unread Messages
```bash
curl http://localhost:3000/briefing
```

### Create a Template
```bash
curl -X POST http://localhost:3000/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meeting Confirmation",
    "text": "Perfect! I\'ve scheduled our meeting for {{date}} at {{time}}. Looking forward to it! {{location}}",
    "category": "business",
    "shortcuts": ["meeting", "confirm"],
    "tags": ["meeting", "confirmation"]
  }'
```

### Detect Tasks from Message
```bash
curl -X POST http://localhost:3000/tasks/detect \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you please send me the project report by tomorrow?",
    "context": "Previous conversation context",
    "senderName": "John Doe"
  }'
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GROQ_API_KEY` | API key for Groq AI service | No | (none) |
| `GEMINI_API_KEY` | API key for Google Gemini AI service | No | (none) |
| `OLLAMA_BASE_URL` | URL for local Ollama service | No | http://localhost:11434 |
| `OLLAMA_MODEL` | Model name for Ollama | No | llama3.2 |
| `TODOIST_API_KEY` | API key for Todoist integration | No | (none) |
| `PORT` | Server port | No | 3000 |
| `WHATSAPP_VERIFY_TOKEN` | Token for webhook verification (for compatibility) | No | whatsapp_verify_token |
| `WHATSAPP_WEBHOOK_SECRET` | Secret for webhook payload verification | No | (none) |
| `MCP_BROKER_URL` | MCP message broker URL | No | http://localhost:8080 |
| `MCP_TOPIC` | Topic for WhatsApp messages in MCP | No | whatsapp_messages |

## Architecture

- `/src/server.js` - Main server file with API endpoints
- `/utils/baileys-client.js` - Baileys WhatsApp Web client wrapper
- `/utils/memory-store.js` - File-based storage for conversations and monitoring
- `/utils/draft-generator.js` - AI-powered response generation
- `/utils/task-manager.js` - Task detection and Todoist integration
- `/utils/template-store.js` - Message template management
- `/config/config.js` - Configuration management
- `/frontend/` - React-based dashboard application
- `/baileys_store_multi/` - Authentication data storage
- `/tests/` - Test files
- `/whatsapp_memories.json` - Conversation history storage
- `/whatsapp_monitoring.json` - Message monitoring data
- `/whatsapp_templates.json` - Template storage

## Troubleshooting

1. **QR code not showing**: Make sure you're accessing the `/qr` endpoint or check the server console
2. **Authentication fails**: Try clearing the `baileys_store_multi` directory and reconnecting
3. **Messages not received**: Verify your phone has internet connection and WhatsApp is active
4. **Connection drops**: The server will attempt to reconnect automatically
5. **AI responses not generating**: Check that at least one AI API key is configured in `.env`
6. **Task detection not working**: Ensure proper AI API keys are set up
7. **Dashboard not connecting**: Verify the backend server is running on the correct port

## Security

- The Baileys implementation stores authentication credentials locally in the `baileys_store_multi` directory
- For production usage, ensure this directory is properly secured
- Restrict server access as appropriate for your deployment environment
- Use HTTPS for API endpoints in production
- Store API keys securely and never commit them to version control
- Consider implementing API rate limiting for production use

## Performance

- File-based storage is suitable for development and small-scale production
- For high-volume usage, consider implementing a database solution
- AI response generation performance depends on the selected AI provider
- Template and message caching is implemented for better performance

## License

MIT
