#!/bin/bash
# Custom backup for Node.js project: ai-whatsapp-mcp-agent

echo "Backing up Node.js project: ai-whatsapp-mcp-agent"

# Backup node_modules if it exists (optional, can be large)
if [ -d "node_modules" ]; then
    echo "Node modules found - consider excluding from backup for size"
fi

# Backup package-lock.json and yarn.lock
[ -f "package-lock.json" ] && echo "Found package-lock.json"
[ -f "yarn.lock" ] && echo "Found yarn.lock"

# Backup environment files
[ -f ".env" ] && echo "Found .env file"
[ -f ".env.local" ] && echo "Found .env.local file"

# Backup build artifacts
[ -d "dist" ] && echo "Found dist directory"
[ -d "build" ] && echo "Found build directory"

exit 0
