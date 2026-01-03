# WhatsApp MCP Agent - Service Management Scripts

This directory contains universal scripts to start and stop the WhatsApp MCP Agent services on both Unix/Linux/macOS and Windows platforms.

## 🚀 Quick Start

### Unix/Linux/macOS (Bash Scripts)

**Start Services:**
```bash
./scripts/start-services.sh
```

**Stop Services:**
```bash
./scripts/stop-services.sh
```

**Force Stop (if needed):**
```bash
./scripts/stop-services.sh --force
```

### Windows (Batch Scripts)

**Start Services:**
```cmd
scripts\start-services.bat
```

**Stop Services:**
```cmd
scripts\stop-services.bat
```

**Force Stop (if needed):**
```cmd
scripts\stop-services.bat --force
```

## 📋 What These Scripts Do

### Start Services (`start-services`)

1. **Environment Check**
   - Verifies project directory structure
   - Checks port availability (3000 for server, 5173 for frontend)
   - Creates logs directory if needed

2. **Dependency Management**
   - Automatically installs npm dependencies if `node_modules` doesn't exist
   - Handles both backend and frontend dependencies

3. **Service Startup**
   - Starts the WhatsApp MCP Server on port 3000
   - Starts the React frontend on port 5173 (if frontend directory exists)
   - Waits for services to be ready
   - Provides health check confirmation

4. **Monitoring**
   - Creates PID file for process tracking
   - Redirects output to log files
   - Displays startup status and URLs

### Stop Services (`stop-services`)

1. **Graceful Shutdown**
   - Attempts to stop processes gracefully first
   - Stops processes by PID if available
   - Falls back to process name matching

2. **Process Discovery**
   - Finds all related Node.js processes
   - Identifies processes using our ports
   - Shows running processes for verification

3. **Force Stop Option**
   - Force kills stubborn processes
   - Clears port conflicts
   - Ensures complete shutdown

4. **Cleanup**
   - Removes PID files
   - Provides log file locations
   - Verifies shutdown completion

## 🔧 Configuration

### Default Ports
- **Backend Server**: 3000
- **Frontend Development**: 5173

### Log Files Location
- `logs/server.log` - Backend server logs
- `logs/frontend.log` - Frontend development server logs
- `whatsapp-agent.pid` - Process ID file (Unix/Linux/macOS)

### Project Structure Expected
```
project-root/
├── src/
│   └── server.js          # Backend server
├── frontend/
│   ├── package.json       # Frontend dependencies
│   └── src/              # Frontend source
├── scripts/
│   ├── start-services.*  # Start scripts
│   └── stop-services.*   # Stop scripts
└── logs/                 # Auto-created log directory
```

## 📊 Service URLs

After successful startup:

- **Backend API**: http://localhost:3000
- **Frontend UI**: http://localhost:5173
- **Health Check**: http://localhost:3000/health
- **QR Code**: http://localhost:3000/qr

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Unix/Linux/macOS
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
lsof -ti:5173 | xargs kill -9  # Kill process on port 5173

# Windows
netstat -ano | findstr :3000   # Find process using port 3000
taskkill /PID <PID> /F         # Kill the process
```

### Services Won't Start
1. Check Node.js is installed: `node --version`
2. Check npm is available: `npm --version`
3. Verify project structure
4. Check logs in `logs/` directory
5. Run with verbose output

### Force Stop All Processes
```bash
# Unix/Linux/macOS
./scripts/stop-services.sh --force

# Windows
scripts\stop-services.bat --force
```

## 🔄 Development Workflow

### Typical Development Session
1. **Start**: `./scripts/start-services.sh`
2. **Develop**: Make changes to code
3. **Test**: Access http://localhost:5173
4. **Stop**: `./scripts/stop-services.sh`

### Continuous Development
The scripts support hot-reloading:
- Backend: Nodemon automatically restarts on file changes
- Frontend: Vite provides instant updates

## 📝 Script Features

### Cross-Platform Compatibility
- **Unix/Linux/macOS**: Bash scripts with full feature support
- **Windows**: Batch files with equivalent functionality
- **Portability**: Same commands work across platforms

### Safety Features
- Port availability checking
- Process verification
- Graceful shutdown attempts
- PID file management
- Log rotation support

### User Experience
- Colored output for better readability
- Progress indicators
- Clear status messages
- Help documentation
- Error handling

## 🚨 Important Notes

1. **Dependencies**: Ensure Node.js and npm are installed
2. **Permissions**: Shell scripts need execute permissions (`chmod +x`)
3. **Antivirus**: Some antivirus software may flag Node.js processes
4. **Firewall**: Allow Node.js through firewall if needed
5. **Resources**: Services consume memory and CPU when running

## 📞 Support

If you encounter issues:

1. Check the logs in the `logs/` directory
2. Verify all dependencies are installed
3. Ensure ports 3000 and 5173 are available
4. Try force stopping and restarting
5. Check the main project README for additional setup requirements

---

**Happy coding! 🎉**