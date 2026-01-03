#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");

/**
 * MCP server definition
 */
const server = new Server(
  {
    name: "whatsapp-mcp-agent",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// WhatsApp API URL
const WHATSAPP_API = process.env.WHATSAPP_API_URL || "http://localhost:3000";

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_whatsapp_message",
        description: "Send a WhatsApp message to a contact",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient phone number (e.g., 1234567890@s.whatsapp.net)" },
            message: { type: "string", description: "Message text to send" }
          },
          required: ["to", "message"]
        }
      },
      {
        name: "get_unread_messages",
        description: "Get all unread WhatsApp messages",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of messages to retrieve", default: 50 }
          }
        }
      },
      {
        name: "get_briefing",
        description: "Get AI briefing of unread WhatsApp messages",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    if (req.params.name === "send_whatsapp_message") {
      const { to, message } = req.params.arguments;

      const response = await axios.post(`${WHATSAPP_API}/send`, {
        to,
        message
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ WhatsApp message sent successfully to ${to}`
          }
        ]
      };
    }

    if (req.params.name === "get_unread_messages") {
      const limit = req.params.arguments?.limit || 50;

      const response = await axios.get(`${WHATSAPP_API}/unread`, {
        params: { limit }
      });

      const messages = response.data.messages || [];
      const messageText = messages.length > 0
        ? `Found ${messages.length} unread messages:\n` +
          messages.map((msg, i) =>
            `${i + 1}. From: ${msg.senderName || msg.senderId}\n   Message: ${msg.content?.text || '[Media]'}\n   Time: ${new Date(msg.timestamp * 1000).toLocaleString()}\n`
          ).join('\n')
        : "No unread messages found.";

      return {
        content: [
          {
            type: "text",
            text: messageText
          }
        ]
      };
    }

    if (req.params.name === "get_briefing") {
      const response = await axios.get(`${WHATSAPP_API}/briefing`);

      return {
        content: [
          {
            type: "text",
            text: response.data.summary || "No unread messages to summarize."
          }
        ]
      };
    }

    throw new Error("Unknown tool");
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error: ${error.message}\n\nMake sure the WhatsApp backend is running on ${WHATSAPP_API}`
        }
      ]
    };
  }
});

/**
 * Connect via stdio
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
