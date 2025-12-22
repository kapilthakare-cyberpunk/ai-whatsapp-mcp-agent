#!/bin/bash

echo "Starting WhatsApp MCP Server & Dashboard..."

# Function to kill background processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "Step 1: Launching Backend (Port 3000)..."
node src/server.js &
BACKEND_PID=$!

# Wait for backend to initialize (give it a few seconds)
sleep 3

# Start Frontend
echo "Step 2: Launching Dashboard (Port 5173)..."
cd frontend && npm run dev -- --host &
FRONTEND_PID=$!

# Wait for frontend to be ready
sleep 3

# Open in Browser
echo "Step 3: Opening Dashboard..."
open http://localhost:5173

echo "✅ System Running!"
echo "   - Backend: http://localhost:3000"
echo "   - Dashboard: http://localhost:5173"
echo "Press Ctrl+C to stop everything."

# Keep script running to maintain background processes
wait