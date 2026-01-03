/**
 * Enhanced LLM Manager with Intelligent Routing & Fallback
 * Supports: Groq, Gemini, Ollama with smart provider selection
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const CircuitBreaker = require('./circuit-breaker');
const ResponseCache = require('./response-cache');
require('dotenv').config();

class EnhancedLLMManager {
  constructor() {
    // API Configuration
    this.providers = {
      groq: {
        name: 'Groq',
        apiKey: process.env.GROQ_API_KEY,
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        priority: 1, // Highest priority (fastest, reliable)
        timeout: 6000,
        costPerToken: 0.0000001 // Approximate
      },
      gemini: {
        name: 'Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
        model: 'gemini-2.0-flash-exp',
        priority: 2, // Fallback (high quality)
        timeout: 8000,
        costPerToken: 0.0000002
      },
      ollama: {
        name: 'Ollama',
        url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_PRIMARY_MODEL || 'mistral',
        fallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2',
        priority: 3, // Local fallback (always available)
        timeout: 15000,
        costPerToken: 0 // Free, local
      }
    };

    // Initialize caching
    this.cache = new ResponseCache();
    
    // Circuit breakers for each provider
    this.breakers = {
      groq: new CircuitBreaker('groq', { failureThreshold: 3, resetTimeout: 30000 }),
      gemini: new CircuitBreaker('gemini', { failureThreshold: 3, resetTimeout: 30000 }),
      ollama: new CircuitBreaker('ollama', { failureThreshold: 5, resetTimeout: 60000 })
    };

    // Statistics tracking
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      providerUsage: { groq: 0, gemini: 0, ollama: 0, template: 0 },
      avgResponseTime: 0,
      errorCount: 0
    };

    // Business context templates
    this.businessContext = {
      company: process.env.BUSINESS_NAME || 'Primes and Zooms Photo and Cine Gear Rentals',
      location: process.env.BUSINESS_LOCATION || 'Pune',
      expertise: 'professional photo and cine equipment rentals, events, and collaborations',
      tone: {
        professional: 'friendly yet professional, knowledgeable about gear',
        social: 'engaging, creative, emoji-friendly',
        event: 'enthusiastic, detail-oriented, collaborative'
      }
    };
  }

  /**
   * Main entry point: Generate intelligent response with automatic fallback
   */
  async generateResponse(message, context = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    console.log(`\n🧠 [LLM Manager] Processing: "${message.substring(0, 60)}..."`);
    
    try {
      // Step 1: Check cache first
      const cacheKey = this._generateCacheKey(message, context);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        console.log(`✅ [Cache] Hit! Returning cached response (${Date.now() - startTime}ms)`);
        return {
          success: true,
          text: cached.text,
          model: cached.model,
          fromCache: true,
          responseTime: Date.now() - startTime,
          confidence: cached.confidence
        };
      }

      // Step 2: Analyze complexity and business context
      const complexity = this._analyzeComplexity(message);
      const businessCtx = this._detectBusinessContext(message);
      
      console.log(`📊 Complexity: ${complexity}, Context: ${businessCtx.type}`);

      // Step 3: Build enhanced prompt
      const enhancedPrompt = this._buildPrompt(message, context, businessCtx);

      // Step 4: Try providers in priority order
      const result = await this._tryProvidersInOrder(enhancedPrompt, complexity, context);

      // Step 5: Cache successful response
      if (result.success && !result.isFallback) {
        await this.cache.set(cacheKey, {
          text: result.text,
          model: result.model,
          confidence: result.confidence,
          timestamp: Date.now()
        });
      }

      result.responseTime = Date.now() - startTime;
      console.log(`✅ [LLM Manager] Response generated (${result.responseTime}ms) via ${result.model}`);
      
      return result;

    } catch (error) {
      this.stats.errorCount++;
      console.error(`❌ [LLM Manager] Error:`, error.message);
      
      // Last resort: Template-based response
      return this._templateFallback(message, context);
    }
  }

  /**
   * Try providers in priority order with circuit breaker protection
   */
  async _tryProvidersInOrder(prompt, complexity, context) {
    const tone = context.tone || 'professional';
    
    // Determine provider order based on complexity
    let providerOrder = ['groq', 'gemini', 'ollama'];
    
    // For simple queries, prefer local Ollama (faster, free)
    if (complexity === 'simple' && this.providers.ollama.apiKey !== false) {
      providerOrder = ['ollama', 'groq', 'gemini'];
    }

    // Try each provider
    for (const providerName of providerOrder) {
      const provider = this.providers[providerName];
      const breaker = this.breakers[providerName];

      // Check if provider is available
      if (!this._isProviderConfigured(providerName)) {
        console.log(`⏭️  [${provider.name}] Not configured, skipping...`);
        continue;
      }

      // Check circuit breaker
      if (!breaker.canAttempt()) {
        console.log(`⚡ [${provider.name}] Circuit breaker OPEN, skipping...`);
        continue;
      }

      try {
        console.log(`🚀 [${provider.name}] Attempting...`);
        const result = await this._callProvider(providerName, prompt, tone, context);
        
        breaker.recordSuccess();
        this.stats.providerUsage[providerName]++;
        
        return {
          success: true,
          text: result.text,
          model: provider.name,
          confidence: result.confidence || 0.9,
          provider: providerName,
          isFallback: false
        };

      } catch (error) {
        breaker.recordFailure();
        console.warn(`⚠️  [${provider.name}] Failed: ${error.message}`);
        continue; // Try next provider
      }
    }

    // All providers failed
    throw new Error('All LLM providers failed');
  }

  /**
   * Call specific provider
   */
  async _callProvider(providerName, prompt, tone, context) {
    switch (providerName) {
      case 'groq':
        return await this._callGroq(prompt, tone);
      case 'gemini':
        return await this._callGemini(prompt, tone);
      case 'ollama':
        return await this._callOllama(prompt, tone);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Call Groq API
   */
  async _callGroq(prompt, tone) {
    const provider = this.providers.groq;
    
    const response = await axios.post(
      provider.url,
      {
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful WhatsApp assistant. Respond concisely and naturally.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: tone === 'personal' ? 0.8 : 0.4,
        max_tokens: 300
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        timeout: provider.timeout
      }
    );

    const text = response.data.choices[0].message.content.trim();
    return { text, confidence: 0.92 };
  }

  /**
   * Call Gemini API
   */
  async _callGemini(prompt, tone) {
    const provider = this.providers.gemini;
    const url = `${provider.url}?key=${provider.apiKey}`;
    
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: tone === 'personal' ? 0.9 : 0.3,
          maxOutputTokens: 300
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: provider.timeout
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = response.data.candidates[0].content.parts[0].text.trim();
      return { text, confidence: 0.9 };
    }

    throw new Error('Invalid Gemini response');
  }

  /**
   * Call Ollama (Local)
   */
  async _callOllama(prompt, tone) {
    const provider = this.providers.ollama;
    
    try {
      // Try primary model first
      return await this._ollamaGenerate(provider.model, prompt, tone, provider.timeout);
    } catch (error) {
      console.log(`⚠️  Primary Ollama model (${provider.model}) failed, trying fallback...`);
      // Try fallback model
      return await this._ollamaGenerate(provider.fallbackModel, prompt, tone, provider.timeout);
    }
  }

  async _ollamaGenerate(model, prompt, tone, timeout) {
    const provider = this.providers.ollama;
    
    const response = await axios.post(
      `${provider.url}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: tone === 'personal' ? 0.8 : 0.4,
          num_predict: 300
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeout
      }
    );

    if (response.data?.response) {
      const text = response.data.response.trim();
      return { text, confidence: 0.85 };
    }

    throw new Error('Invalid Ollama response');
  }

  /**
   * Build enhanced prompt with business context
   */
  _buildPrompt(message, context, businessCtx) {
    const { company, location, expertise } = this.businessContext;
    const tone = context.tone || 'professional';
    const conversationHistory = context.conversationHistory || '';
    const senderName = context.senderName || 'Unknown contact';

    let systemContext = `You are replying to a WhatsApp message for ${company} in ${location}.\n`;
    systemContext += `Business: ${expertise}\n\n`;

    // Add business-specific context
    if (businessCtx.type !== 'general') {
      systemContext += `CONTEXT: ${businessCtx.description}\n`;
      systemContext += `SUGGESTED APPROACH: ${businessCtx.approach}\n\n`;
    }

    // Add conversation history
    if (conversationHistory) {
      systemContext += `RECENT CONVERSATION:\n${conversationHistory}\n\n`;
    }

    systemContext += `SENDER: ${senderName}\n`;
    systemContext += `INCOMING MESSAGE: "${message}"\n\n`;

    // Tone-specific instructions
    if (tone === 'professional') {
      systemContext += `Write a PROFESSIONAL reply that:\n`;
      systemContext += `- Is polite, clear, and business-appropriate\n`;
      systemContext += `- Shows expertise in photo/cine equipment\n`;
      systemContext += `- Provides helpful information or next steps\n`;
      systemContext += `- Is concise (2-4 sentences)\n`;
    } else {
      systemContext += `Write a WARM, FRIENDLY reply that:\n`;
      systemContext += `- Feels natural and conversational\n`;
      systemContext += `- Shows genuine interest\n`;
      systemContext += `- Uses 1-2 emojis if appropriate\n`;
      systemContext += `- Is concise (2-4 sentences)\n`;
    }

    systemContext += `\nRETURN ONLY the ready-to-send message text.`;

    return systemContext;
  }

  /**
   * Detect business context from message
   */
  _detectBusinessContext(message) {
    const lower = message.toLowerCase();

    // Rental inquiry
    if (lower.match(/rent|hire|book|available|price|cost|rate/)) {
      return {
        type: 'rental_inquiry',
        description: 'Customer is inquiring about equipment rental',
        approach: 'Be helpful with pricing/availability, suggest contacting for details'
      };
    }

    // Social media / collaboration
    if (lower.match(/collab|partner|event|instagram|social|post/)) {
      return {
        type: 'collaboration',
        description: 'Potential collaboration or social media inquiry',
        approach: 'Be enthusiastic, express interest in collaboration'
      };
    }

    // Equipment question
    if (lower.match(/camera|lens|sony|canon|gimbal|light|microphone|equipment|gear/)) {
      return {
        type: 'equipment_query',
        description: 'Question about specific equipment',
        approach: 'Show technical knowledge, be helpful'
      };
    }

    // General inquiry
    return {
      type: 'general',
      description: 'General conversation',
      approach: 'Be friendly and professional'
    };
  }

  /**
   * Analyze message complexity
   */
  _analyzeComplexity(message) {
    const wordCount = message.split(' ').length;
    
    // Check for complex indicators
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const hasTechnicalTerms = message.match(/sony|canon|sigma|red|arri|blackmagic|gimbal|codec|resolution/i);
    const requiresResearch = message.match(/compare|difference|better|best|recommend/i);

    if (wordCount > 50 || hasMultipleQuestions || requiresResearch) {
      return 'complex';
    } else if (wordCount > 20 || hasTechnicalTerms) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Check if provider is configured
   */
  _isProviderConfigured(providerName) {
    const provider = this.providers[providerName];
    
    if (providerName === 'ollama') {
      // Ollama doesn't need API key, just check if URL is set
      return true;
    }
    
    return !!provider.apiKey;
  }

  /**
   * Generate cache key
   */
  _generateCacheKey(message, context) {
    const tone = context.tone || 'professional';
    const simplified = message.toLowerCase().trim().substring(0, 100);
    return `${tone}:${simplified}`;
  }

  /**
   * Template-based fallback (last resort)
   */
  _templateFallback(message, context) {
    const tone = context.tone || 'professional';
    this.stats.providerUsage.template++;

    const templates = {
      professional: "Thank you for your message. I'll review this and get back to you shortly with the information you need.",
      personal: "Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊"
    };

    console.log(`📋 [Template] Using fallback template`);

    return {
      success: true,
      text: templates[tone],
      model: 'template',
      confidence: 0.5,
      isFallback: true,
      responseTime: 0
    };
  }

  /**
   * Get health status of all providers
   */
  async getHealthStatus() {
    const health = {};

    for (const [name, provider] of Object.entries(this.providers)) {
      const breaker = this.breakers[name];
      
      health[name] = {
        name: provider.name || name,
        configured: this._isProviderConfigured(name),
        circuitState: breaker.getState(),
        failureCount: breaker.failureCount,
        successCount: breaker.successCount,
        lastFailure: breaker.lastFailureTime,
        priority: provider.priority
      };
    }

    return health;
  }

  /**
   * Get statistics
   */
  getStats() {
    const cacheHitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      cacheHitRate: `${cacheHitRate}%`,
      errorRate: this.stats.totalRequests > 0 
        ? ((this.stats.errorCount / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      providerUsage: { groq: 0, gemini: 0, ollama: 0, template: 0 },
      avgResponseTime: 0,
      errorCount: 0
    };
  }
}

module.exports = EnhancedLLMManager;
