# WhatsApp AI Agent with Memory and Draft Response Generation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Memory System](#memory-system)
4. [Message Monitoring](#message-monitoring)
5. [Draft Response Generation](#draft-response-generation)
6. [API Endpoints](#api-endpoints)
7. [Usage Examples](#usage-examples)
8. [Integration Guide](#integration-guide)
9. [Deployment](#deployment)

## Overview

The WhatsApp AI Agent is a comprehensive system that integrates with WhatsApp Web using Baileys, provides persistent memory capabilities, monitors incoming messages, and generates contextual AI draft responses. The system enables contextual conversations while maintaining user control over responses.

### Key Features
- WhatsApp Web integration via Baileys
- Persistent conversation memory with JSON storage
- Real-time message monitoring and analytics
- Dual-toned draft response generation (Professional & Friendly)
- RESTful API for external integrations
- Context-aware AI responses based on conversation history

## Architecture

The system is built with a modular architecture consisting of several key components:

### Core Components
```
whatsapp-mcp-server/
├── src/
│   └── server.js                 # Main Express server
├── utils/
│   ├── baileys-client.js         # WhatsApp client using Baileys
│   ├── memory-store.js           # Memory and monitoring system
│   └── draft-generator.js        # Draft response generation
├── config/
│   └── config.js                 # Configuration settings
└── package.json                  # Dependencies and scripts
```

### Architecture Flow
1. **WhatsApp Integration Layer**: Uses Baileys to connect to WhatsApp Web
2. **Message Processing Layer**: Handles incoming/outgoing messages with context
3. **Memory Management Layer**: Stores and retrieves conversation history
4. **AI Response Generation**: Creates contextual draft responses
5. **API Layer**: Exposes endpoints for external system integration
6. **Monitoring Layer**: Real-time tracking and analytics of messages

### Data Flow
1. Incoming messages are captured by Baileys client
2. Messages are processed and stored in memory system
3. Monitoring data is recorded separately for analytics
4. AI system analyzes context and generates draft responses
5. Drafts are made available via API for user selection
6. Selected draft is sent to WhatsApp if approved by user

## Memory System

The memory system provides persistent storage of conversation history and user context, enabling contextual AI responses.

### Memory Store Features
- **Persistent Storage**: JSON-based file storage for durability
- **Conversation Context**: Maintains message history per user
- **Entity Tracking**: Stores user-specific information and preferences
- **Metadata Enrichment**: Captures timestamps, message types, and properties
- **Automatic Cleanup**: Maintains recent message limits to prevent bloat

### Memory Structure
```
{
  "user_id:conversation_id": [
    {
      "id": "uuid",
      "userId": "user_id",
      "conversationId": "conversation_id",
      "message": "text content",
      "timestamp": 1634567890123,
      "metadata": {
        "messageType": "text",
        "timestamp": 1634567890123,
        "messageId": "msg_id",
        "isGroup": false,
        "source": "whatsapp"
      }
    }
  ]
}
```

### Memory Operations
- `addMemory(userId, conversationId, message, metadata)`: Store a new message
- `getMemories(userId, conversationId, limit)`: Retrieve recent messages
- `searchMemories(userId, conversationId, query, limit)`: Search by content
- `getConversationContext(userId, conversationId, limit)`: Get conversation summary

## Message Monitoring

The monitoring system provides real-time tracking and analytics of all incoming messages.

### Monitoring Capabilities
- **Real-time Tracking**: Captures every incoming message automatically
- **Message Classification**: Distinguishes between individual and group messages
- **Metadata Capture**: Records sender info, group details, message types
- **Filtering Options**: Sort by type, user, group, or date range
- **Analytics Dashboard**: Statistics on message patterns and engagement

### Monitoring Data Structure
```
{
  "id": "message_id",
  "senderId": "user_id",
  "senderName": "Display Name",
  "type": "text|image|video|audio|document|location",
  "content": {
    "type": "text",
    "text": "Message content"
  },
  "timestamp": 1634567890123,
  "isGroupMessage": false,
  "groupId": "group_id",
  "groupName": "Group Name",
  "messageId": "whatsapp_msg_id",
  "rawMessage": "Full WhatsApp message object"
}
```

### Monitoring Operations
- `addMonitoredMessage(messageData)`: Record a new message
- `getMonitoredMessages(limit, offset)`: Retrieve monitored messages
- `getMonitoredMessagesByType(type, limit)`: Filter by message type
- `getMonitoredMessagesByUser(userId, limit)`: Filter by user
- `getMonitoredMessagesByGroup(groupId, limit)`: Filter by group
- `getMonitoringStats()`: Get analytics and statistics

## Draft Response Generation

The draft response system generates two contextual response options with different toning for user selection.

### Dual-Tone Approach
- **Professional Tone**: Structured, formal language suitable for business contexts
- **Friendly Tone**: Conversational, approachable language for casual interactions
- **Context Integration**: Both options consider conversation history
- **Intent Analysis**: Responses tailored based on message purpose

### Draft Generation Process
1. **Message Analysis**: Determine intent (question, request, update, general)
2. **Context Integration**: Incorporate conversation history
3. **Tone Application**: Generate professional and friendly versions
4. **Quality Assurance**: Ensure distinct yet appropriate responses

### Draft Response Features
- **Two Options**: Professional and friendly tone options
- **Confidence Scoring**: Likelihood of response appropriateness
- **Tone Identification**: Clear labeling of response style
- **Context Awareness**: Uses conversation history for personalization
- **Intent-Based Responses**: Tailored to message purpose

### Draft Structure
```
[
  {
    "id": "draft-1",
    "text": "Professional response text...",
    "tone": "professional",
    "confidence": 0.9,
    "suggested": true
  },
  {
    "id": "draft-2",
    "text": "Friendly response text...",
    "tone": "friendly",
    "confidence": 0.85,
    "suggested": true
  }
]
```

## API Endpoints

The system exposes a comprehensive REST API for integration with external systems.

### Authentication
No authentication required for development. In production, implement JWT or API key authentication.

### Base URL
`http://localhost:3000`

### Health Check
```
GET /health
```
**Response:**
```json
{
  "status": "OK",
  "connected": true,
  "timestamp": "2023-10-19T14:30:00.000Z"
}
```

### WhatsApp Connection
```
GET /qr
```
**Response:**
```json
{
  "status": "success",
  "qr": "base64_encrypted_qr_data",
  "message": "Scan QR with WhatsApp to log in"
}
```

### Draft Generation
```
POST /drafts
Content-Type: application/json

{
  "message": "User message text",
  "context": "Conversation context (optional)"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Draft responses generated successfully",
  "drafts": [
    {
      "id": "draft-1",
      "text": "Professional response...",
      "tone": "professional",
      "confidence": 0.9,
      "suggested": true
    },
    {
      "id": "draft-2",
      "text": "Friendly response...",
      "tone": "friendly",
      "confidence": 0.85,
      "suggested": true
    }
  ]
}
```

### AI Process (Returns Drafts Only)
```
POST /process-ai
Content-Type: application/json

{
  "userId": "user_id",
  "message": "User message text"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Draft responses generated successfully",
  "drafts": [/* Similar to /drafts response */],
  "context": "Conversation context used"
}
```

### Send Message
```
POST /send
Content-Type: application/json

{
  "to": "whatsapp_phone_number",
  "message": "Message text"
}
```

### Conversation Context
```
GET /context/{userId}
```

### User Preferences
```
GET /preferences/{userId}
```

### Conversation Summary
```
GET /summary/{userId}
```

### Conversation History
```
GET /history/{userId}?limit=20
```

### Monitored Messages
```
GET /monitored-messages?limit=50&offset=0
```

### Monitored Messages by Type
```
GET /monitored-messages/type/{type}
```

### Monitored Messages by User
```
GET /monitored-messages/user/{userId}
```

### Monitored Messages by Group
```
GET /monitored-messages/group/{groupId}
```

### Monitoring Statistics
```
GET /monitoring-stats
```

## Usage Examples

### Generate Draft Responses
```bash
curl -X POST http://localhost:3000/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you help me prepare for the client meeting?",
    "context": "We discussed quarterly results last week"
  }'
```

### Process Message and Get Drafts
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "1234567890@c.us",
    "message": "How can I improve my project delivery process?"
  }'
```

### Check Monitoring Statistics
```bash
curl http://localhost:3000/monitoring-stats
```

### Get Messages from Specific User
```bash
curl "http://localhost:3000/monitored-messages/user/1234567890@c.us?limit=10"
```

### Get Messages from Specific Group
```bash
curl "http://localhost:3000/monitored-messages/group/1234567890@g.us?limit=10"
```

### Get Conversation Context
```bash
curl http://localhost:3000/context/1234567890@c.us
```

## Integration Guide

### External System Integration
The WhatsApp AI Agent can be integrated with external systems through its REST API:

1. **Message Processing Systems**: Integrate with existing message processing workflows
2. **CRM Systems**: Connect to customer relationship management platforms
3. **Analytics Platforms**: Feed monitoring data to business intelligence tools
4. **Notification Systems**: Trigger additional notifications based on message content

### Webhook Integration Pattern
1. Receive message from external source
2. Forward to `/drafts` or `/process-ai` endpoint
3. Receive draft options in response
4. Present options to user for selection
5. Optionally send selected response via `/send` endpoint

### LLM Integration
The system is designed to work with various LLM providers:

```javascript
// Example integration with OpenAI
const { OpenAI } = require('openai');

class OpenAIResponseGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(userMessage, context) {
    const completion = await this.openai.chat.completions.create({
      messages: [
        { "role": "system", "content": "You are a helpful assistant that responds in both professional and friendly tones." },
        { "role": "user", "content": `Context: ${context}\nMessage: ${userMessage}` }
      ],
      model: "gpt-3.5-turbo",
    });

    return completion.choices[0].message.content;
  }
}
```

## Deployment

### Prerequisites
- Node.js 18+
- npm or yarn package manager
- WhatsApp account for the bot

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set environment variables (if needed)
4. Start the server: `npm start`

### Configuration
The system uses a configuration file (`config/config.js`) for settings:

```javascript
module.exports = {
  port: process.env.PORT || 3000,
  whatsapp: {
    browser: process.env.BROWSER || 'Chrome',
    // WhatsApp-specific settings
  },
  memory: {
    filePath: process.env.MEMORY_FILE_PATH || './whatsapp_memories.json',
    monitorFilePath: process.env.MONITOR_FILE_PATH || './whatsapp_monitoring.json'
  },
  // Additional configuration options
};
```

### Environment Variables
- `PORT`: Server port (default: 3000)
- `MEMORY_FILE_PATH`: Path for memory storage (default: './whatsapp_memories.json')
- `MONITOR_FILE_PATH`: Path for monitoring data (default: './whatsapp_monitoring.json')

### Production Considerations
- Implement authentication for API endpoints
- Set up HTTPS with TLS/SSL
- Configure persistent storage for production
- Implement proper logging and monitoring
- Add rate limiting to prevent abuse
- Set up backup systems for memory files

### Security
- Never expose the server directly to the internet without authentication
- Implement API rate limiting
- Use environment variables for sensitive configuration
- Regularly update dependencies
- Monitor for suspicious access patterns

### Memory Management
The system automatically manages memory usage:
- Conversation memory is limited to 50 entries per user-conversation pair
- Monitoring data is limited to 1000 recent entries
- Files are automatically created if they don't exist
- JSON format ensures human-readable storage

## Troubleshooting

### Common Issues
1. **WhatsApp Connection Fails**: Ensure the QR code is scanned within the timeout period
2. **Memory Files Not Found**: Files are automatically created on first access
3. **API Endpoints Return Errors**: Check server logs for detailed error information

### Logging
The system logs important events to the console:
- WhatsApp connection status
- API requests and responses
- Error conditions
- Memory operations

## Support

For support, check the server logs and ensure all dependencies are properly installed. The modular design allows for easy debugging of individual components.