#!/usr/bin/env node

/**
 * WhatsApp Communication Manager MCP Server
 * Connects to 5ire app (Claude Desktop) to help manage WhatsApp communications
 * Supports both stdio and HTTP transports
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const express = require('express');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const axios = require('axios');

// Your WhatsApp server URL
const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://localhost:3000';

const server = new Server(
  {
    name: 'whatsapp-communication-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_unread_messages',
        description: 'Get all unread WhatsApp messages with sender, content, and priority.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max messages (default: 50)', default: 50 },
          },
        },
      },
      {
        name: 'get_briefing',
        description: 'Get AI briefing of unread messages with categories and insights.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'send_whatsapp_message',
        description: 'Send WhatsApp message to contact.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient ID (phonenumber@s.whatsapp.net)' },
            message: { type: 'string', description: 'Message text' },
          },
          required: ['to', 'message'],
        },
      },
      {
        name: 'generate_reply_draft',
        description: 'Generate AI reply (professional/personal tone).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Sender ID' },
            message: { type: 'string', description: 'Message to reply to' },
            tone: { type: 'string', enum: ['professional', 'personal'], description: 'Reply tone' },
          },
          required: ['userId', 'message', 'tone'],
        },
      },
      {
        name: 'get_connection_status',
        description: 'Check WhatsApp connection status.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_unread_messages': {
        const res = await axios.get(`${WHATSAPP_API}/unread`, {
          params: { limit: args.limit || 50 },
        });
        
        const messages = res.data.messages.map(msg => ({
          id: msg.id,
          from: msg.senderName || msg.senderId,
          message: msg.content?.text || `[${msg.type}]`,
          timestamp: new Date(msg.timestamp * 1000).toLocaleString(),
          priority: msg.priority,
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ total: messages.length, messages }, null, 2),
          }],
        };
      }

      case 'get_briefing': {
        const res = await axios.get(`${WHATSAPP_API}/briefing`);
        return {
          content: [{
            type: 'text',
            text: res.data.summary || 'No unread messages',
          }],
        };
      }

      case 'send_whatsapp_message': {
        await axios.post(`${WHATSAPP_API}/send`, {
          to: args.to,
          message: args.message,
        });
        return {
          content: [{
            type: 'text',
            text: `✅ Message sent to ${args.to}`,
          }],
        };
      }

      case 'generate_reply_draft': {
        const res = await axios.post(`${WHATSAPP_API}/process-ai`, {
          userId: args.userId,
          message: args.message,
          tone: args.tone,
        });
        const draft = res.data.draft;
        return {
          content: [{
            type: 'text',
            text: `📝 ${args.tone.toUpperCase()} DRAFT:\n\n${draft.text}\n\nConfidence: ${(draft.confidence * 100).toFixed(0)}%`,
          }],
        };
      }

      case 'get_connection_status': {
        const res = await axios.get(`${WHATSAPP_API}/status`);
        return {
          content: [{
            type: 'text',
            text: `🔌 Status: ${res.data.status.toUpperCase()}`,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error.message}\n\nEnsure WhatsApp server runs on ${WHATSAPP_API}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  const transportMode = process.env.TRANSPORT || 'stdio';

  if (transportMode === 'http') {
    // HTTP Server mode for 5ire
    const app = express();
    const PORT = process.env.PORT || 3001;

    app.use(express.json());

    app.post('/mcp', async (req, res) => {
      try {
        const { method, params, id } = req.body;

        let result;
        if (method === 'initialize') {
          result = await server.processRequest({
            jsonrpc: '2.0',
            id,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: '5ire', version: '1.0.0' }
            }
          });
        } else if (method === 'tools/list') {
          result = await server.processRequest({
            jsonrpc: '2.0',
            id,
            method: 'tools/list',
            params: {}
          });
        } else if (method === 'tools/call') {
          result = await server.processRequest({
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params
          });
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: { code: -32000, message: error.message }
        });
      }
    });

    app.listen(PORT, () => {
      console.log(`WhatsApp MCP Server running on HTTP port ${PORT}`);
    });
  } else {
    // Stdio mode for Claude Desktop
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('WhatsApp MCP Server running on stdio');
  }
}

main().catch(console.error);
