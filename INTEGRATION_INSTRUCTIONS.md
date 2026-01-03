# Integration Instructions - Update Existing Server

## Option 1: Minimal Changes (Recommended for Testing)

### Step 1: Add Enhanced LLM Manager to server.js

At the top of `src/server.js`, after line 9, add:

```javascript
// Add after: const { generateDraft, generateBriefing } = require('../utils/draft-generator');

// NEW: Enhanced LLM Manager
const EnhancedLLMManager = require('../utils/enhanced-llm-manager');
const llmManager = new EnhancedLLMManager();
const RateLimiter = require('../utils/rate-limiter');
const rateLimiter = new RateLimiter();
```

### Step 2: Update the generateAIDraftWithTone Function

Find the `generateAIDraftWithTone` function (around line 130) and replace it with:

```javascript
async function generateAIDraftWithTone(userMessage, context, tone) {
  try {
    // NEW: Use enhanced LLM manager
    const result = await llmManager.generateResponse(userMessage, {
      tone: tone,
      conversationHistory: context,
      senderName: 'User'
    });
    
    if (result.success) {
      return {
        text: result.text,
        tone: tone,
        confidence: result.confidence || 0.9,
        model: result.model,
        fromCache: result.fromCache,
        responseTime: result.responseTime
      };
    } else {
      throw new Error('Draft generation failed');
    }
  } catch (error) {
    console.error('Error generating AI draft:', error);
    // Fallback to original template
    if (tone === 'professional') {
      return {
        text: `Thank you for your message. I'll review this and get back to you shortly.`,
        tone: 'professional',
        confidence: 0.5,
        model: 'fallback'
      };
    } else {
      return {
        text: `Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊`,
        tone: 'personal',
        confidence: 0.5,
        model: 'fallback'
      };
    }
  }
}
```

### Step 3: Add Rate Limiting to process-ai Endpoint

Update the `/process-ai` endpoint (around line 98) to include rate limiting:

```javascript
// Endpoint to process incoming messages with AI (returns drafts but doesn't send)
app.post('/process-ai', async (req, res) => {
  try {
    const { userId, message, tone } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "userId" or "message" in request body'
      });
    }

    if (!tone || !['professional', 'personal'].includes(tone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or invalid "tone" parameter. Must be "professional" or "personal"'
      });
    }

    // NEW: Check rate limit
    const rateCheck = await rateLimiter.checkLimit(userId, req.ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit exceeded. Please wait a moment.',
        retryAfter: rateCheck.retryAfter
      });
    }

    // Get conversation context for AI processing (no connection required for draft generation)
    let context = '';
    try {
      context = await baileysClient.getConversationContext(userId);
    } catch (contextError) {
      console.log('Could not retrieve context, proceeding with message only:', contextError.message);
    }

    // Generate single AI response draft with specified tone
    const draft = await generateAIDraftWithTone(message, context, tone);

    // NEW: Record request for rate limiting
    await rateLimiter.recordRequest(userId, req.ip);

    res.status(200).json({
      status: 'success',
      message: 'Draft response generated successfully',
      draft,
      context
    });
  } catch (error) {
    console.error('Error processing AI:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

### Step 4: Add New Monitoring Endpoints

Add these endpoints before the `initializeBaileys()` function:

```javascript
// ==========================================
// NEW ENDPOINTS: Enhanced LLM Monitoring
// ==========================================

// Get LLM health status
app.get('/health/llm', async (req, res) => {
  try {
    const health = await llmManager.getHealthStatus();
    res.status(200).json({
      status: 'success',
      providers: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get LLM statistics
app.get('/stats/llm', (req, res) => {
  try {
    const stats = llmManager.getStats();
    const rateStats = rateLimiter.getStats();
    
    res.status(200).json({
      status: 'success',
      llm: stats,
      rateLimiter: rateStats,
      timestamp: new Date().toISOString()
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
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Clear cache (admin endpoint - protect this in production!)
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

// Reset rate limiter (admin endpoint)
app.post('/ratelimit/reset', (req, res) => {
  try {
    rateLimiter.reset();
    res.status(200).json({
      status: 'success',
      message: 'Rate limiter reset successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

### Step 5: Add Ollama Warmup (Optional but Recommended)

Before `initializeBaileys().then(() => {`, add:

```javascript
// Warm up Ollama on startup
async function warmupOllama() {
  console.log('🔥 Warming up Ollama...');
  try {
    await llmManager.generateResponse("warmup", { tone: "professional" });
    console.log('✅ Ollama warmed up and ready');
  } catch (error) {
    console.log('⚠️  Ollama warmup failed (will try on first request):', error.message);
  }
}

// Initialize Baileys and warm up Ollama
Promise.all([
  initializeBaileys(),
  warmupOllama()
]).then(() => {
  // Start the server
  const server = app.listen(PORT, () => {
    console.log(`WhatsApp MCP Server is running on port ${PORT}`);
    console.log(`QR endpoint: GET http://localhost:${PORT}/qr`);
    console.log(`Status endpoint: GET http://localhost:${PORT}/status`);
    console.log(`Send message endpoint: POST http://localhost:${PORT}/send`);
    console.log(`Health check endpoint: GET http://localhost:${PORT}/health`);
    console.log(`LLM health endpoint: GET http://localhost:${PORT}/health/llm`); // NEW
    console.log(`LLM stats endpoint: GET http://localhost:${PORT}/stats/llm`); // NEW
  });
});
```

---

## Option 2: Complete Replacement (For Production)

If you want to completely replace the old draft generator:

### Step 1: Backup Old File
```bash
cp utils/draft-generator.js utils/draft-generator.js.backup
```

### Step 2: Update draft-generator.js

Replace the entire `generateDraft` function in `utils/draft-generator.js` with a wrapper:

```javascript
const EnhancedLLMManager = require('./enhanced-llm-manager');
const llmManager = new EnhancedLLMManager();

async function generateDraft({ userId, message, tone = 'professional', context = '', senderName = '' }) {
  try {
    const result = await llmManager.generateResponse(message, {
      tone: tone,
      conversationHistory: context,
      senderName: senderName
    });
    
    return {
      success: true,
      draft: {
        text: result.text,
        tone: tone,
        confidence: result.confidence,
        timestamp: Date.now(),
        model: result.model,
        fromCache: result.fromCache
      }
    };
  } catch (error) {
    // Fallback
    const fallbackText = tone === 'professional'
      ? "Thank you for your message. I'll review this and get back to you shortly."
      : "Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊";
      
    return {
      success: true,
      draft: {
        text: fallbackText,
        tone: tone,
        confidence: 0.5,
        timestamp: Date.now(),
        model: 'fallback',
        isFallback: true
      }
    };
  }
}

// Keep generateBriefing as is...
```

---

## Testing Your Integration

### Step 1: Install Dependencies
```bash
npm install node-cache
```

### Step 2: Update .env
```bash
cp .env.example.new .env
# Edit .env with your API keys
```

### Step 3: Setup Ollama
```bash
bash scripts/setup-ollama.sh
```

### Step 4: Verify Setup
```bash
node scripts/verify-setup.js
```

### Step 5: Start Server
```bash
npm start
```

### Step 6: Test Message Generation
```bash
curl -X POST http://localhost:3000/process-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@s.whatsapp.net",
    "message": "Hello!",
    "tone": "personal"
  }'
```

### Step 7: Check Health
```bash
curl http://localhost:3000/health/llm
curl http://localhost:3000/stats/llm
```

---

## Rollback Instructions (If Needed)

If something goes wrong, you can easily rollback:

```bash
# Restore old draft generator
cp utils/draft-generator.js.backup utils/draft-generator.js

# Remove new dependencies from server.js
# (Comment out the lines you added)

# Restart server
npm start
```

---

## What to Expect

### First Request (Cold Start)
- Response time: 1-2 seconds (Ollama loading model)
- Provider: Ollama (local)

### Subsequent Requests
- Response time: 200-800ms
- Provider: Groq/Gemini/Ollama (based on complexity)
- Cache hits: 25-35% (increases over time)

### Monitoring
```bash
# Check provider health
curl http://localhost:3000/health/llm

# Check statistics
curl http://localhost:3000/stats/llm
```

---

## Need Help?

1. Check logs: `tail -f logs/*.log`
2. Run verification: `node scripts/verify-setup.js`
3. Test providers: `npm run test:llms`
4. Review IMPLEMENTATION_GUIDE.md
5. Check ENHANCEMENT_SUMMARY.md

---

**Last Updated:** January 2026
