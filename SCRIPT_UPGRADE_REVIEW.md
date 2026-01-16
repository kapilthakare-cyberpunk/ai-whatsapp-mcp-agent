# Script Upgrade Review: configure-and-run.sh

## Overview
This document reviews the improvements made to the `scripts/configure-and-run.sh` script in the WhatsApp MCP Agent project.

## Changes Implemented

### 1. Environment Variable Support
- The `prompt_value()` function now accepts an environment variable name as a parameter
- If an environment variable is already set, the script uses it silently without prompting
- This enables automated deployments and overrides without user intervention

### 2. TTY Detection and Handling
- Added `is_tty()` function to detect if stdin/stdout are connected to a terminal
- Added `/dev/tty` handling to allow prompting even when stdin isn't a TTY
- This resolves issues where the script would hang in non-interactive environments

### 3. Yes/No Prompt Normalization
- Added `prompt_yes_no()` function to normalize yes/no responses
- Prevents the script from hanging on ambiguous input
- Standardizes responses to 'Y' or 'N' format

### 4. Enhanced Process Management
- Added `stop_pid_file()` function to properly terminate running processes
- Added `full_wipe()` function to clean up data and processes
- Improved cleanup capabilities for better resource management

### 5. Cloudflared Tunnel Integration
- Added `start_cloudflared_quick()` for temporary tunnels
- Added `start_cloudflared_named()` for named tunnels using config files
- Added user prompts for tunnel selection

## Testing Results

### Environment Variable Override
```bash
APP_PORT=3005 MCP_PORT=3006 START_TUNNEL=Y npm run setup:run
```
- Script successfully used provided environment variables
- No prompts appeared for values provided via environment variables
- Generated .env files correctly populated with provided values

### Default Behavior
- When environment variables are not set, the script prompts for input
- Properly handles secret values (API keys) with masked input
- Falls back to defaults when no input is provided

### Service Startup
- Backend, frontend, and MCP server start correctly based on configuration
- Checks for existing processes on ports before starting new ones
- Creates appropriate log files for each service

## Key Benefits

1. **Autonomous Operation**: Can run without user interaction when environment variables are provided
2. **Interactive Capability**: Still prompts users when needed in interactive environments  
3. **Robust Error Handling**: Properly handles edge cases and non-interactive environments
4. **Flexible Configuration**: Multiple ways to provide configuration (prompts, defaults, environment variables)
5. **Improved UX**: Better user experience with clearer prompts and error handling

## Usage Examples

### Fully Automated Setup
```bash
APP_PORT=3005 MCP_PORT=3006 FRONTEND_PORT=5173 \
GEMINI_API_KEY=my_key GROQ_API_KEY=my_key \
WIPE_CONFIRM=N START_TUNNEL=N npm run setup:run
```

### Interactive Setup (Default)
```bash
npm run setup:run
```
Prompts for all required values with sensible defaults.

### Mixed Approach
```bash
GEMINI_API_KEY=my_key START_TUNNEL=Y npm run setup:run
```
Uses provided environment variables but prompts for other values.

## Conclusion

The script has been successfully upgraded to meet all specified requirements:
- ✅ Uses environment variables silently when present
- ✅ Prompts in terminal when inputs are missing (even when stdin isn't TTY)
- ✅ Falls back to defaults when no prompt is possible
- ✅ Normalizes yes/no prompts to prevent hanging
- ✅ Maintains backward compatibility with interactive usage

The improvements make the script much more flexible and suitable for both development and deployment scenarios.