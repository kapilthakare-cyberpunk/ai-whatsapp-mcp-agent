# MCP Client Setup Guide

This guide explains how to connect MCP clients to the WhatsApp MCP server.

## Prerequisites

- WhatsApp server running on your chosen port (default 3005 in this setup).
- MCP server running in SSE mode (default 3006).

Start servers manually (example):

```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm start
```

```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent/mcp-server
TRANSPORT=sse PORT=3006 WHATSAPP_API_URL=http://localhost:3005 node index.js
```

## ChatGPT "Custom Tool" MCP (SSE)

When you create a new MCP tool in ChatGPT:

- Name: `WhatsApp MCP`
- Description: `Access and manage WhatsApp messages`
- MCP Server URL: `http://YOUR_HOST:3006/sse`
- Authentication: `None` (leave OAuth fields empty)

Notes:

- If ChatGPT runs in a browser, `YOUR_HOST` must be reachable from the public internet.
- Use a tunnel (Cloudflare Tunnel, ngrok, or similar) to expose `http://localhost:3006/sse`.

## Do / Don’t (Troubleshooting)

Do:

- Use the SSE URL ending with `/sse`.
- Set Authentication to **None / No auth**.
- Keep the MCP server and tunnel running while ChatGPT connects.
- Add a Cloudflare WAF skip rule for `/sse` if you see 403 errors.
- Disable Bot Fight Mode for the MCP hostname if Cloudflare blocks requests.

Don’t:

- Don’t use OAuth unless you implemented it in your MCP server.
- Don’t point ChatGPT at `http://localhost:3006/sse` (it needs a public URL).
- Don’t use the Connectors / Deep Research guide (it expects `search`/`fetch` tools).

## Example: Local test with curl

You can confirm the SSE handshake:

```bash
curl -sN http://localhost:3006/sse --max-time 2
```

You should see an `event: endpoint` line with a session id.
