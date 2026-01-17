#!/usr/bin/env node

/**
 * WhatsApp Communication Manager MCP Server
 * Connects to 5ire app (Claude Desktop) to help manage WhatsApp communications
 * Supports both stdio and HTTP transports
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const express = require('express');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const axios = require('axios');

// Your WhatsApp server URL
const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://localhost:3000';

function createServer() {
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
        {
          name: 'list_chats',
          description: 'List recent WhatsApp chats.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max chats (default: 50)', default: 50 },
            },
          },
        },
        {
          name: 'backfill_recent_chats',
          description: 'Backfill recent messages across chats into the database.',
          inputSchema: {
            type: 'object',
            properties: {
              chatLimit: { type: 'number', description: 'Number of chats to backfill (default: 100)', default: 100 },
              messagesPerChat: { type: 'number', description: 'Messages per chat (default: 35)', default: 35 },
              delayMs: { type: 'number', description: 'Delay between chats in ms (default: 250)', default: 250 },
            },
          },
        },
        {
          name: 'get_telegram_unread_messages',
          description: 'Get all unread Telegram messages.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max messages (default: 50)', default: 50 },
            },
          },
        },
        {
          name: 'send_telegram_message',
          description: 'Send a Telegram message to a chat.',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Chat ID' },
              message: { type: 'string', description: 'Message text' },
            },
            required: ['to', 'message'],
          },
        },
        {
          name: 'get_telegram_status',
          description: 'Check Telegram connection status.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_telegram_briefing',
          description: 'Get AI briefing of unread Telegram messages.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_telegram_chats',
          description: 'List recent Telegram chats.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max chats (default: 50)', default: 50 },
            },
          },
        },
        {
          name: 'generate_telegram_reply_draft',
          description: 'Generate AI reply for Telegram (professional/personal tone).',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: { type: 'string', description: 'Telegram chat ID' },
              message: { type: 'string', description: 'Message to reply to' },
              tone: { type: 'string', enum: ['professional', 'personal'], description: 'Reply tone' },
              senderName: { type: 'string', description: 'Sender display name (optional)' },
            },
            required: ['threadId', 'message', 'tone'],
          },
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

        case 'list_chats': {
          const res = await axios.get(`${WHATSAPP_API}/chats`, {
            params: { limit: args.limit || 50 },
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            }],
          };
        }

        case 'backfill_recent_chats': {
          const res = await axios.post(`${WHATSAPP_API}/backfill`, {
            chatLimit: args.chatLimit || 100,
            messagesPerChat: args.messagesPerChat || 35,
            delayMs: args.delayMs || 250,
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            }],
          };
        }

        case 'get_telegram_unread_messages': {
          const res = await axios.get(`${WHATSAPP_API}/telegram/unread`, {
            params: { limit: args.limit || 50 },
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            }],
          };
        }

        case 'send_telegram_message': {
          await axios.post(`${WHATSAPP_API}/telegram/send`, {
            to: args.to,
            message: args.message,
          });
          return {
            content: [{
              type: 'text',
              text: `✅ Telegram message sent to ${args.to}`,
            }],
          };
        }

        case 'get_telegram_status': {
          const res = await axios.get(`${WHATSAPP_API}/telegram/status`);
          return {
            content: [{
              type: 'text',
              text: `📨 Telegram status: ${res.data.status.toUpperCase()}`,
            }],
          };
        }

        case 'get_telegram_briefing': {
          const res = await axios.get(`${WHATSAPP_API}/telegram/briefing`);
          return {
            content: [{
              type: 'text',
              text: res.data.summary || 'No unread Telegram messages',
            }],
          };
        }

        case 'list_telegram_chats': {
          const res = await axios.get(`${WHATSAPP_API}/telegram/chats`, {
            params: { limit: args.limit || 50 },
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            }],
          };
        }

        case 'generate_telegram_reply_draft': {
          const res = await axios.post(`${WHATSAPP_API}/telegram/process-ai`, {
            threadId: args.threadId,
            message: args.message,
            tone: args.tone,
            senderName: args.senderName || '',
          });
          const draft = res.data.draft;
          return {
            content: [{
              type: 'text',
              text: `📝 ${args.tone.toUpperCase()} TELEGRAM DRAFT:\n\n${draft.text}\n\nConfidence: ${(draft.confidence * 100).toFixed(0)}%`,
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

  return server;
}

async function main() {
  const transportMode = process.env.TRANSPORT || 'stdio';

  if (transportMode === 'http') {
    // HTTP Server mode for 5ire
    const app = express();
    const PORT = process.env.PORT || 3001;
    const server = createServer();

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
  } else if (transportMode === 'sse') {
    const app = express();
    const PORT = process.env.PORT || 3001;
    const transports = new Map();

    app.use(express.json({ limit: '4mb' }));
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    });

    app.get('/sse', async (req, res) => {
      const server = createServer();
      const transport = new SSEServerTransport('/message', res);
      transports.set(transport.sessionId, transport);
      transport.onclose = () => transports.delete(transport.sessionId);
      await server.connect(transport);
    });

    app.post('/message', async (req, res) => {
      const sessionId = req.query.sessionId || req.get('mcp-session-id');
      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(404).send('Unknown session');
        return;
      }
      await transport.handlePostMessage(req, res, req.body);
    });

    app.listen(PORT, () => {
      console.log(`WhatsApp MCP Server running on SSE port ${PORT}`);
      console.log(`SSE endpoint: GET http://localhost:${PORT}/sse`);
    });
  } else {
    // Stdio mode for Claude Desktop
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('WhatsApp MCP Server running on stdio');
  }
}

main().catch(console.error);
