@echo off
setlocal enabledelayedexpansion

:: WhatsApp MCP Agent - Start Services Script (Windows)
:: This script starts the WhatsApp MCP server and frontend services

set "PROJECT_DIR=%~dp0.."
set "SERVER_PORT=3000"
set "FRONTEND_PORT=5173"
set "LOG_DIR=%PROJECT_DIR%\logs"
set "PID_FILE=%PROJECT_DIR%\whatsapp-agent.pid"

echo 🚀 Starting WhatsApp MCP Agent Services...
echo Project Directory: %PROJECT_DIR%
echo Server Port: %SERVER_PORT%
echo Frontend Port: %FRONTEND_PORT%
echo.

:: Create logs directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Function to check if port is in use
:check_port
set "PORT=%~1"
echo 🔍 Checking if port %PORT% is available...
netstat -an | findstr ":%PORT%" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Port %PORT% is already in use
    exit /b 1
) else (
    echo ✅ Port %PORT% is available
    exit /b 0
)

:: Function to start the backend server
:start_backend
echo 📡 Starting WhatsApp MCP Server...

cd /d "%PROJECT_DIR%"

:: Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo ❌ Failed to install dependencies
        exit /b 1
    )
)

:: Start the server in background
echo Starting server...
start /B npm start > "%LOG_DIR%\server.log" 2>&1

echo ✅ Server started
echo 📊 Server logs: %LOG_DIR%\server.log

:: Wait for server to be ready
echo ⏳ Waiting for server to be ready...
set "attempts=0"
:wait_server
set /a attempts+=1
if %attempts% GTR 30 (
    echo ❌ Server failed to start within 60 seconds
    exit /b 1
)

timeout /t 2 /nobreak >nul
curl -s http://localhost:%SERVER_PORT%/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Server is ready!
    goto :start_frontend
) else (
    goto :wait_server
)

:: Function to start the frontend
:start_frontend
if exist "%PROJECT_DIR%\frontend" (
    echo 🌐 Starting Frontend Development Server...
    
    cd /d "%PROJECT_DIR%\frontend"
    
    :: Check if node_modules exists
    if not exist "node_modules" (
        echo 📦 Installing frontend dependencies...
        call npm install
        if !ERRORLEVEL! NEQ 0 (
            echo ⚠️  Failed to install frontend dependencies
            goto :show_info
        )
    )
    
    :: Start frontend in background
    start /B npm run dev > "%LOG_DIR%\frontend.log" 2>&1
    
    echo ✅ Frontend started
    echo 📊 Frontend logs: %LOG_DIR%\frontend.log
    
    :: Wait for frontend to be ready
    echo ⏳ Waiting for frontend to be ready...
    set "attempts=0"
    :wait_frontend
    set /a attempts+=1
    if %attempts% GTR 30 (
        echo ⚠️  Frontend may still be starting up
        goto :show_info
    )
    
    timeout /t 2 /nobreak >nul
    curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Frontend is ready!
        goto :show_info
    ) else (
        goto :wait_frontend
    )
) else (
    echo ℹ️  No frontend directory found, skipping frontend startup
    goto :show_info
)

:: Show final information
:show_info
echo.
echo 🎉 All services started successfully!
echo 📊 Server: http://localhost:%SERVER_PORT%
echo 🌐 Frontend: http://localhost:%FRONTEND_PORT%
echo 📋 Health Check: http://localhost:%SERVER_PORT%/health
echo.
echo 📁 Logs Directory: %LOG_DIR%
echo 🔧 Management: Use 'scripts\stop-services.bat' to stop services
echo.
echo ✅ WhatsApp MCP Agent is now running!
pause