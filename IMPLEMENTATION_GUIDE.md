# 🚀 Enhanced AI WhatsApp Agent - Implementation Guide

## Quick Start (5 Minutes)

### Step 1: Install New Dependencies
```bash
cd /home/kapilt/Projects/ai-whatsapp-mcp-agent
npm install node-cache
```

### Step 2: Setup Ollama (Local AI)
```bash
# Make script executable
chmod +x scripts/setup-ollama.sh

# Run setup (installs Ollama and downloads models)
bash scripts/setup-ollama.sh
```

### Step 3: Update Environment Variables
```bash
# Copy new env example
cp .env.example.new .env

# Edit .env and add your API keys
nano .env
```

Required changes:
- Add your `GROQ_API_KEY` (get from https://console.groq.com)
- Add your `GEMINI_API_KEY` (get from https://aistudio.google.com/app/apikey)
- Update business information (BUSINESS_NAME, BUSINESS_LOCATION)

### Step 4: Update Server to Use Enhanced LLM Manager
```bash
# Backup current draft-generator
cp utils/draft-generator.js utils/draft-generator.js.backup

# The new enhanced-llm-manager.js is already created
# Now we need to integrate it into server.js
```

### Step 5: Test LLM Providers
```bash
# Test all AI providers
npm run test:llms
```

Expected output:
```
🧪 Testing LLM Providers
✅ Groq: Working
✅ Gemini: Working  
✅ Ollama: Working
📊 Cache hit rate: 0%
```

### Step 6: Start the Server
```bash
npm start
```

---

## Integration with Existing Code

### Option 1: Drop-in Replacement (Recommended)

Update `src/server.js` to use the new `EnhancedLLMManager` instead of the old `draft-generator`:

```javascript
// OLD CODE (line 8-9):
// const { generateDraft, generateBriefing } = require('../utils/draft-generator');

// NEW CODE:
const EnhancedLLMManager = require('../utils/enhanced-llm-manager');
const llmManager = new EnhancedLLMManager();

// Update the generateAIDraftWithTone function (around line 130):
async function generateAIDraftWithTone(userMessage, context, tone) {
  try {
    const result = await llmManager.generateResponse(userMessage, {
      tone: tone,
      conversationHistory: context,
      senderName: 'User'
    });
    
    if (result.success) {
      return {
        text: result.text,
        tone: tone,
        confidence: result.confidence,
        model: result.model,
        fromCache: result.fromCache
      };
    } else {
      throw new Error('Response generation failed');
    }
  } catch (error) {
    console.error('Error generating AI draft:', error);
    // Fallback
    return {
      text: tone === 'professional' 
        ? "Thank you for your message. I'll review this and get back to you shortly."
        : "Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊",
      tone: tone,
      confidence: 0.5,
      model: 'fallback'
    };
  }
}
```

### Option 2: Gradual Migration

Keep both systems and gradually migrate:

```javascript
// Add feature flag in .env
USE_ENHANCED_LLM=true

// In server.js:
const useEnhancedLLM = process.env.USE_ENHANCED_LLM === 'true';

if (useEnhancedLLM) {
  const EnhancedLLMManager = require('../utils/enhanced-llm-manager');
  const llmManager = new EnhancedLLMManager();
} else {
  const { generateDraft } = require('../utils/draft-generator');
}
```

---

## New API Endpoints to Add

Add these to `src/server.js`:

```javascript
// ==========================================
// ENHANCED LLM ENDPOINTS
// ==========================================

// Get LLM health status
app.get('/health/llm', async (req, res) => {
  try {
    const health = await llmManager.getHealthStatus();
    res.status(200).json({
      status: 'success',
      providers: health
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get LLM statistics
app.get('/stats/llm', (req, res) => {
  try {
    const stats = llmManager.getStats();
    res.status(200).json({
      status: 'success',
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Clear cache (admin endpoint)
app.post('/cache/clear', async (req, res) => {
  try {
    await llmManager.cache.clear();
    res.status(200).json({
      status: 'success',
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get cache statistics
app.get('/stats/cache', (req, res) => {
  try {
    const stats = llmManager.cache.getStats();
    res.status(200).json({
      status: 'success',
      cache: stats
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

---

## Testing the Enhanced System

### Test 1: Simple Query (Should use Ollama or cache)
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@s.whatsapp.net",
    "message": "Hello!",
    "tone": "personal"
  }'
```

### Test 2: Business Query (Should use Groq/Gemini)
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@s.whatsapp.net",
    "message": "What equipment do you have for wedding shoots?",
    "tone": "professional"
  }'
```

### Test 3: Check Provider Health
```bash
curl http://localhost:3000/health/llm
```

### Test 4: Check Statistics
```bash
curl http://localhost:3000/stats/llm
curl http://localhost:3000/stats/cache
```

---

## Performance Optimization Tips

### 1. Warm Up Ollama on Startup

Add to `src/server.js` before starting the server:

```javascript
async function warmupOllama() {
  console.log('🔥 Warming up Ollama...');
  try {
    await llmManager.generateResponse("warmup", { tone: "professional" });
    console.log('✅ Ollama warmed up');
  } catch (error) {
    console.log('⚠️  Ollama warmup failed (will try on first request)');
  }
}

// Call before starting server
warmupOllama().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`WhatsApp MCP Server is running on port ${PORT}`);
  });
});
```

### 2. Pre-cache Common Responses

Create `scripts/precache-responses.js`:

```javascript
const EnhancedLLMManager = require('../utils/enhanced-llm-manager');
const llmManager = new EnhancedLLMManager();

const commonQueries = [
  { message: "Hello", tone: "personal" },
  { message: "Thank you", tone: "personal" },
  { message: "What are your rates?", tone: "professional" },
  { message: "Do you have Sony cameras?", tone: "professional" }
];

async function precacheResponses() {
  console.log('📦 Pre-caching common responses...');
  
  for (const query of commonQueries) {
    await llmManager.generateResponse(query.message, { tone: query.tone });
  }
  
  console.log('✅ Pre-caching complete!');
  const stats = llmManager.getStats();
  console.log(`Cached ${stats.cacheHits} responses`);
}

precacheResponses();
```

Run: `node scripts/precache-responses.js`

---

## Troubleshooting

### Issue: Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve

# Test a model
ollama run llama3.2 "test"
```

### Issue: High memory usage
```bash
# Reduce cache size in .env
CACHE_MAX_KEYS=100  # Default is 500

# Or disable file cache
ENABLE_FILE_CACHE=false
```

### Issue: Slow responses
Check which provider is being used:
```javascript
// The response includes the model used
{
  "text": "...",
  "model": "Groq",  // Or "Gemini", "Ollama"
  "responseTime": 250
}
```

If Ollama is slow:
- Use a smaller model (llama3.2 instead of mistral)
- Increase timeout in enhanced-llm-manager.js
- Check system resources (RAM, CPU)

### Issue: API rate limits hit
```bash
# Check quota status
curl http://localhost:3000/stats/llm

# Response shows:
{
  "providerUsage": {
    "groq": 150,
    "gemini": 50,
    "ollama": 200
  }
}
```

Solutions:
- Use Ollama more (it's unlimited)
- Increase cache TTL
- Add rate limiting per user

---

## Advanced Configuration

### Custom Business Context

Edit `utils/enhanced-llm-manager.js` around line 45:

```javascript
this.businessContext = {
  company: 'Primes and Zooms',
  location: 'Pune',
  expertise: 'professional photo and cine equipment rentals',
  
  // Add specific gear knowledge
  equipment: {
    cameras: ['Sony A7S3', 'Canon R5', 'RED Komodo'],
    lenses: ['Sigma Art series', 'Canon L-series'],
    audio: ['Rode NTG5', 'Sennheiser G4']
  },
  
  // Add pricing tiers
  pricing: {
    student: '10% discount',
    weekend: 'Special rates',
    bulk: 'Package deals available'
  },
  
  // Add social media info
  social: {
    instagram: '@primesandzooms',
    responseTime: '< 2 hours'
  }
};
```

### Fine-tune Model Selection

Edit the `_analyzeComplexity` function to customize when to use which model:

```javascript
_analyzeComplexity(message) {
  // Use Ollama for simple greetings (fast, free)
  if (message.match(/^(hi|hello|hey|thanks|thank you)$/i)) {
    return 'simple';
  }
  
  // Use Groq for business queries (fast, good quality)
  if (message.match(/price|rent|book|available/i)) {
    return 'medium';
  }
  
  // Use Gemini for complex/creative (best quality)
  if (message.match(/compare|recommend|suggest|create|design/i)) {
    return 'complex';
  }
  
  return 'medium';
}
```

---

## Monitoring Dashboard (Coming Soon)

The system now tracks everything you need for a monitoring dashboard:
- Provider health and circuit breaker status
- Response times per provider
- Cache hit rates
- Request volume
- Error rates

Data available via:
- `GET /health/llm` - Provider status
- `GET /stats/llm` - Usage statistics
- `GET /stats/cache` - Cache performance

---

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Setup Ollama (`bash scripts/setup-ollama.sh`)
3. ✅ Configure .env file
4. ✅ Test providers (`npm run test:llms`)
5. ⬜ Integrate with existing server.js
6. ⬜ Deploy and monitor
7. ⬜ Fine-tune based on usage patterns

---

## Support

- Ollama Issues: https://github.com/ollama/ollama/issues
- Groq API Docs: https://console.groq.com/docs
- Gemini API Docs: https://ai.google.dev/docs

For project-specific questions, check:
- Implementation guide (this file)
- Enhancement plan artifact (detailed architecture)
- Code comments in enhanced-llm-manager.js

---

**Last Updated:** January 2026
**Version:** 2.0.0
