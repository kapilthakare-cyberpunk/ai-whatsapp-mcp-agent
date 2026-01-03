#!/usr/bin/env node

/**
 * MCP Server for 5ire - Advanced WhatsApp Tools
 * Optimized stdio transport for 5ire integration
 * 
 * Tools Available:
 * - send_whatsapp_message: Send WhatsApp messages
 * - get_unread_messages: Get all unread messages
 * - get_briefing: AI-powered briefing of messages
 * - generate_reply_draft: Generate professional replies
 * - search_messages: Search messages by keyword
 * - get_message_history: Get conversation history with contact
 * - get_contact_list: Retrieve all contacts
 * - get_connection_status: Check WhatsApp connection status
 * - mark_messages_read: Mark messages as read
 * - get_chat_preview: Get preview of recent chats
 * - create_group: Create a new WhatsApp group
 * - set_chat_status: Set online/away status
 */

const { Server } = require('@modelcontextprotocol/sdk/server');
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} = require('@modelcontextprotocol/sdk/types');
const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3000';

/**
 * Tool definitions for 5ire
 */
const TOOLS = [
  {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message to a contact or group',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Contact name, phone number, or group name'
        },
        message: {
          type: 'string',
          description: 'The message content to send'
        }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'get_unread_messages',
    description: 'Retrieve all unread WhatsApp messages with sender and timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of messages to retrieve (default: 20)',
          default: 20
        }
      }
    }
  },
  {
    name: 'get_briefing',
    description: 'Get an AI-powered briefing summarizing all unread messages',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: ['concise', 'detailed', 'executive'],
          description: 'Briefing style (concise=bullet points, detailed=full summary, executive=key points)'
        }
      }
    }
  },
  {
    name: 'generate_reply_draft',
    description: 'Generate a professional or casual reply to a message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The original message to reply to'
        },
        tone: {
          type: 'string',
          enum: ['professional', 'casual', 'friendly', 'formal'],
          description: 'Tone of the reply'
        }
      },
      required: ['message', 'tone']
    }
  },
  {
    name: 'search_messages',
    description: 'Search through messages by keyword or topic',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Search term or keyword'
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)'
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'get_message_history',
    description: 'Get conversation history with a specific contact',
    inputSchema: {
      type: 'object',
      properties: {
        contact: {
          type: 'string',
          description: 'Contact name or phone number'
        },
        limit: {
          type: 'number',
          description: 'Number of recent messages to retrieve (default: 20)'
        }
      },
      required: ['contact']
    }
  },
  {
    name: 'get_contact_list',
    description: 'Retrieve list of all contacts with their status',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter by name or status (online/offline)'
        }
      }
    }
  },
  {
    name: 'get_connection_status',
    description: 'Check WhatsApp connection status and availability',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mark_messages_read',
    description: 'Mark messages from a contact as read',
    inputSchema: {
      type: 'object',
      properties: {
        contact: {
          type: 'string',
          description: 'Contact name or group name'
        },
        all: {
          type: 'boolean',
          description: 'Mark all messages from contact as read',
          default: true
        }
      },
      required: ['contact']
    }
  },
  {
    name: 'get_chat_preview',
    description: 'Get preview of recent chats with last message and timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of chats to preview (default: 10)'
        }
      }
    }
  },
  {
    name: 'create_group',
    description: 'Create a new WhatsApp group with multiple members',
    inputSchema: {
      type: 'object',
      properties: {
        groupName: {
          type: 'string',
          description: 'Name for the new group'
        },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of contact names or phone numbers to add'
        }
      },
      required: ['groupName', 'members']
    }
  },
  {
    name: 'set_chat_status',
    description: 'Set user status (online/away/offline)',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['online', 'away', 'offline', 'dnd'],
          description: 'Status to set (dnd = Do Not Disturb)'
        },
        message: {
          type: 'string',
          description: 'Optional status message'
        }
      },
      required: ['status']
    }
  }
];

/**
 * Call WhatsApp API endpoint
 */
async function callWhatsAppAPI(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${WHATSAPP_API_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(`WhatsApp API error: ${error.message}`);
  }
}

/**
 * Handle tool calls
 */
async function handleToolCall(toolName, toolInput) {
  switch (toolName) {
    case 'send_whatsapp_message':
      return await callWhatsAppAPI('/send', 'POST', {
        to: toolInput.to,
        message: toolInput.message
      });
    
    case 'get_unread_messages':
      return await callWhatsAppAPI(`/messages?limit=${toolInput.limit || 20}`);
    
    case 'get_briefing':
      return await callWhatsAppAPI('/briefing', 'POST', {
        style: toolInput.style || 'concise'
      });
    
    case 'generate_reply_draft':
      return await callWhatsAppAPI('/draft', 'POST', {
        message: toolInput.message,
        tone: toolInput.tone
      });
    
    case 'search_messages':
      return await callWhatsAppAPI(`/search?keyword=${encodeURIComponent(toolInput.keyword)}&limit=${toolInput.limit || 10}`);
    
    case 'get_message_history':
      return await callWhatsAppAPI(`/history/${encodeURIComponent(toolInput.contact)}?limit=${toolInput.limit || 20}`);
    
    case 'get_contact_list':
      return await callWhatsAppAPI(`/contacts${toolInput.filter ? `?filter=${toolInput.filter}` : ''}`);
    
    case 'get_connection_status':
      return await callWhatsAppAPI('/status');
    
    case 'mark_messages_read':
      return await callWhatsAppAPI('/mark-read', 'POST', {
        contact: toolInput.contact,
        all: toolInput.all !== false
      });
    
    case 'get_chat_preview':
      return await callWhatsAppAPI(`/chats?limit=${toolInput.limit || 10}`);
    
    case 'create_group':
      return await callWhatsAppAPI('/create-group', 'POST', {
        groupName: toolInput.groupName,
        members: toolInput.members
      });
    
    case 'set_chat_status':
      return await callWhatsAppAPI('/status', 'POST', {
        status: toolInput.status,
        message: toolInput.message
      });
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Initialize and start MCP server
 */
async function main() {
  const server = new Server({
    name: '5ire-whatsapp-mcp',
    version: '1.0.0'
  });

  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS
    };
  });

  // Handler for tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await handleToolCall(request.params.name, request.params.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  });

  // Start the server
  const transport = server.createStdioTransport();
  await server.connect(transport);
  
  console.error('[5ire WhatsApp MCP] Server started successfully');
  console.error(`[5ire WhatsApp MCP] Connected to WhatsApp API at ${WHATSAPP_API_URL}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
