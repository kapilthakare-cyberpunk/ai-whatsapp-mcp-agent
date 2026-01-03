/**
 * Quick Verification Test
 * Run this to verify your enhanced setup is working
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkConfig() {
  log(colors.cyan, '\n📋 Checking Configuration...');
  
  const checks = [
    { name: 'GROQ_API_KEY', value: process.env.GROQ_API_KEY, required: false },
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY, required: false },
    { name: 'OLLAMA_BASE_URL', value: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', required: true },
    { name: 'BUSINESS_NAME', value: process.env.BUSINESS_NAME, required: true }
  ];

  let allGood = true;
  for (const check of checks) {
    if (check.value) {
      log(colors.green, `✅ ${check.name}: Set`);
    } else {
      if (check.required) {
        log(colors.red, `❌ ${check.name}: NOT SET (REQUIRED)`);
        allGood = false;
      } else {
        log(colors.yellow, `⚠️  ${check.name}: NOT SET (optional, but recommended)`);
      }
    }
  }

  return allGood;
}

async function checkOllama() {
  log(colors.cyan, '\n🔍 Checking Ollama...');
  
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
    
    if (response.data && response.data.models) {
      log(colors.green, `✅ Ollama is running`);
      log(colors.green, `   Models installed: ${response.data.models.length}`);
      
      const recommendedModels = ['llama3.2', 'mistral', 'phi3', 'qwen2.5'];
      const installedModels = response.data.models.map(m => m.name.split(':')[0]);
      
      recommendedModels.forEach(model => {
        if (installedModels.some(installed => installed.includes(model))) {
          log(colors.green, `   ✓ ${model}`);
        } else {
          log(colors.yellow, `   ⚠️  ${model} (not installed - optional)`);
        }
      });
      
      return true;
    }
  } catch (error) {
    log(colors.red, `❌ Ollama is not running or not accessible`);
    log(colors.yellow, `   Start it with: ollama serve`);
    return false;
  }
}

async function checkServer() {
  log(colors.cyan, '\n🌐 Checking Server...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    
    if (response.data && response.data.status === 'OK') {
      log(colors.green, `✅ Server is running on port 3000`);
      return true;
    }
  } catch (error) {
    log(colors.red, `❌ Server is not running`);
    log(colors.yellow, `   Start it with: npm start`);
    return false;
  }
}

async function checkLLMHealth() {
  log(colors.cyan, '\n🤖 Checking LLM Providers...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health/llm`, { timeout: 5000 });
    
    if (response.data && response.data.providers) {
      const providers = response.data.providers;
      
      for (const [name, status] of Object.entries(providers)) {
        if (status.configured && status.circuitState === 'CLOSED') {
          log(colors.green, `✅ ${status.name}: Ready (${status.successCount} successes)`);
        } else if (!status.configured) {
          log(colors.yellow, `⚠️  ${status.name}: Not configured`);
        } else {
          log(colors.red, `❌ ${status.name}: ${status.circuitState}`);
        }
      }
      
      return true;
    }
  } catch (error) {
    log(colors.yellow, `⚠️  Could not check LLM health (server might not have enhanced manager yet)`);
    return false;
  }
}

async function testMessage() {
  log(colors.cyan, '\n💬 Testing Message Generation...');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/process-ai`,
      {
        userId: 'test@s.whatsapp.net',
        message: 'Hello! This is a test message.',
        tone: 'personal'
      },
      { timeout: 10000 }
    );

    if (response.data && response.data.draft) {
      log(colors.green, `✅ Message generation working!`);
      log(colors.blue, `   Model used: ${response.data.draft.model || 'unknown'}`);
      log(colors.blue, `   Response: "${response.data.draft.text.substring(0, 80)}..."`);
      return true;
    }
  } catch (error) {
    log(colors.red, `❌ Message generation failed: ${error.message}`);
    return false;
  }
}

async function runVerification() {
  log(colors.cyan, '\n╔════════════════════════════════════════════════╗');
  log(colors.cyan, '║   AI WhatsApp Agent - Verification Test       ║');
  log(colors.cyan, '╚════════════════════════════════════════════════╝');

  const results = {
    config: await checkConfig(),
    ollama: await checkOllama(),
    server: await checkServer()
  };

  if (results.server) {
    results.llmHealth = await checkLLMHealth();
    results.testMessage = await testMessage();
  }

  log(colors.cyan, '\n╔════════════════════════════════════════════════╗');
  log(colors.cyan, '║               VERIFICATION SUMMARY             ║');
  log(colors.cyan, '╚════════════════════════════════════════════════╝');

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    log(colors.green, '\n🎉 ALL CHECKS PASSED!');
    log(colors.green, '\nYour enhanced AI WhatsApp agent is ready to use!');
    log(colors.cyan, '\nNext steps:');
    log(colors.reset, '1. Start sending messages via WhatsApp');
    log(colors.reset, '2. Monitor performance: curl http://localhost:3000/stats/llm');
    log(colors.reset, '3. Check IMPLEMENTATION_GUIDE.md for advanced features');
  } else {
    log(colors.yellow, '\n⚠️  SOME CHECKS FAILED');
    log(colors.yellow, '\nPlease fix the issues above and run this test again.');
    log(colors.cyan, '\nCommon solutions:');
    
    if (!results.config) {
      log(colors.reset, '• Configuration: Update your .env file with API keys');
    }
    if (!results.ollama) {
      log(colors.reset, '• Ollama: Run "ollama serve" in a terminal');
    }
    if (!results.server) {
      log(colors.reset, '• Server: Run "npm start" to start the server');
    }
  }

  log(colors.reset, '\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
runVerification().catch(error => {
  log(colors.red, `\n❌ Verification failed: ${error.message}`);
  process.exit(1);
});
