#!/bin/bash
# Custom restore for Node.js project: ai-whatsapp-mcp-agent

echo "Restoring Node.js project: ai-whatsapp-mcp-agent"

# Install dependencies
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    if command -v pnpm &> /dev/null && [ -f "pnpm-lock.yaml" ]; then
        pnpm install
    elif command -v yarn &> /dev/null && [ -f "yarn.lock" ]; then
        yarn install
    else
        npm install
    fi
fi

# Restore environment files
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "Creating .env from .env.example"
    cp .env.example .env
fi

# Build project if needed
if [ -f "package.json" ] && npm run build --silent 2>/dev/null; then
    echo "Building project..."
    npm run build
fi
