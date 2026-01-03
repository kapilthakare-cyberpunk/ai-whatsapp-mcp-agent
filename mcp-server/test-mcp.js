const { spawn } = require('child_process');
const path = require('path');

// Path to the MCP server
const serverPath = path.join(__dirname, 'index.js');

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let messageId = 1;

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: messageId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: messageId++,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Listen for responses
server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  console.log('Server exited with code:', code);
});

// Clean up after 5 seconds
setTimeout(() => {
  server.kill();
}, 5000);