require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  whatsApp: {
    // For Baileys implementation, we don't need access tokens
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'whatsapp_verify_token',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET
  },
  mcp: {
    brokerUrl: process.env.MCP_BROKER_URL || 'http://localhost:8080',
    topic: process.env.MCP_TOPIC || 'whatsapp_messages'
  }
};

// For Baileys implementation, no specific environment variables are required
// Authentication will happen through QR code scanning

module.exports = config;