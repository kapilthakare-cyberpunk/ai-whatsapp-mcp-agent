@echo off
setlocal enabledelayedexpansion

:: WhatsApp MCP Agent - Stop Services Script (Windows)
:: This script stops the WhatsApp MCP server and frontend services gracefully

set "PROJECT_DIR=%~dp0.."
set "LOG_DIR=%PROJECT_DIR%\logs"

echo 🛑 Stopping WhatsApp MCP Agent Services...
echo Project Directory: %PROJECT_DIR%
echo.

:: Function to stop process by PID
:stop_process
set "PID=%~1"
set "NAME=%~2"

if "!PID!"=="" (
    echo ℹ️  No PID found for !NAME!
    exit /b 0
)

tasklist /FI "PID eq !PID!" 2>nul | find /I /N "node.exe">nul
if %ERRORLEVEL% NEQ 0 (
    echo ℹ️  Process !NAME! (PID: !PID!) is not running
    exit /b 0
)

echo ⏹️  Stopping !NAME! (PID: !PID!)...

:: Try graceful shutdown first
taskkill /PID !PID! /T /F >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ !NAME! stopped successfully
) else (
    echo ❌ Failed to stop !NAME!
)

exit /b 0

:: Function to stop process by name
:stop_process_by_name
set "PROCESS_NAME=%~1"
set "DISPLAY_NAME=%~2"

echo 🔍 Looking for !DISPLAY_NAME! processes...

:: Find processes by name
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO csv ^| findstr /V "INFO"') do (
    set "PID=%%i"
    set "PID=!PID:"=!"
    
    :: Check if this process is related to our server
    wmic process where "PID=!PID!" get CommandLine /value 2>nul | findstr /I "%PROCESS_NAME%" >nul
    if !ERRORLEVEL! EQU 0 (
        call :stop_process !PID! !DISPLAY_NAME!
    )
)

exit /b 0

:: Function to show running processes
:show_running_processes
echo 📊 Checking for running WhatsApp services...

:: Check for Node.js processes running our server
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO csv 2^>nul') do (
    set "PID=%%i"
    set "PID=!PID:"=!"
    
    wmic process where "PID=!PID!" get CommandLine /value 2>nul | findstr /I "server.js" >nul
    if !ERRORLEVEL! EQU 0 (
        echo ⚠️  Found Node.js server process: !PID!
    )
    
    wmic process where "PID=!PID!" get CommandLine /value 2>nul | findstr /I "vite\|dev" >nul
    if !ERRORLEVEL! EQU 0 (
        echo ⚠️  Found frontend process: !PID!
    )
)

:: Check for processes using our ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    if "%%a" NEQ "" (
        echo ⚠️  Process using port 3000: %%a
    )
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    if "%%a" NEQ "" (
        echo ⚠️  Process using port 5173: %%a
    )
)

exit /b 0

:: Function to force stop everything
:force_stop_all
echo 🚨 Force stopping all WhatsApp services...

:: Kill all node processes (be careful with this)
echo 🔪 Stopping all Node.js processes...
taskkill /IM node.exe /T /F >nul 2>&1

:: Clear port 3000
echo 🔪 Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    if "%%a" NEQ "" (
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: Clear port 5173
echo 🔪 Clearing port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    if "%%a" NEQ "" (
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo ✅ Force stop completed
exit /b 0

:: Function to graceful stop
:graceful_stop
echo 🤝 Attempting graceful shutdown...

:: Stop server processes
call :stop_process_by_name "server.js" "Backend Server"

:: Stop frontend processes
call :stop_process_by_name "vite\|dev" "Frontend Server"

echo ✅ Graceful stop completed
exit /b 0

:: Main execution
echo === WhatsApp MCP Agent Shutdown ===

:: Check if force flag is set
set "FORCE=false"
if "%~1"=="-f" (
    set "FORCE=true"
    echo 🚨 Force mode enabled
    call :force_stop_all
    goto :show_info
)

if "%~1"=="--force" (
    set "FORCE=true"
    echo 🚨 Force mode enabled
    call :force_stop_all
    goto :show_info
)

:: Show running processes first
call :show_running_processes
echo.

:: Try graceful shutdown first
call :graceful_stop

:: Check if any processes are still running
echo.
echo 🔍 Verifying shutdown...
timeout /t 2 /nobreak >nul

:: Check for remaining processes
set "REMAINING_PROCESSES=false"
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO csv 2^>nul') do (
    set "PID=%%i"
    set "PID=!PID:"=!"
    
    wmic process where "PID=!PID!" get CommandLine /value 2>nul | findstr /I "server.js\|vite\|dev" >nul
    if !ERRORLEVEL! EQU 0 (
        set "REMAINING_PROCESSES=true"
        echo ⚠️  Some processes are still running: !PID!
    )
)

if "!REMAINING_PROCESSES!"=="true" (
    echo    Run with --force to force stop all processes
) else (
    echo ✅ All processes stopped successfully
)

:: Show logs location
if exist "%LOG_DIR%" (
    echo.
    echo 📁 Log files available in: %LOG_DIR%
    if exist "%LOG_DIR%\server.log" echo    Server logs: %LOG_DIR%\server.log
    if exist "%LOG_DIR%\frontend.log" echo    Frontend logs: %LOG_DIR%\frontend.log
)

echo.
echo 🛑 WhatsApp MCP Agent services stopped
echo 🔧 To start again: scripts\start-services.bat
pause

exit /b 0

:: Show usage if help requested
:show_help
echo WhatsApp MCP Agent - Stop Services Script
echo.
echo Usage:
echo   %0 [options]
echo.
echo Options:
echo   -f, --force     Force stop all processes (including stuck ones)
echo   -h, --help      Show this help message
echo.
echo Examples:
echo   %0              # Graceful shutdown
echo   %0 --force      # Force shutdown
echo.
exit /b 0

:: Check for help flag
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

:: Run main function
call :main

:main
:: Already handled above, just a placeholder for clarity
exit /b 0