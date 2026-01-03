/**
 * Test script for LLM providers
 * Tests Groq, Gemini, and Ollama connectivity and response quality
 */

const EnhancedLLMManager = require('../utils/enhanced-llm-manager');
require('dotenv').config();

const testMessages = [
  {
    message: "Hello! How are you?",
    tone: "personal",
    description: "Simple greeting"
  },
  {
    message: "What's the rental price for Sony A7S3 camera?",
    tone: "professional",
    description: "Business inquiry"
  },
  {
    message: "Can you suggest some interesting Instagram content ideas for photo gear rental business?",
    tone: "professional",
    description: "Complex creative query"
  }
];

async function testLLMProviders() {
  console.log('\n🧪 Testing LLM Providers\n');
  console.log('=' .repeat(60));
  
  const llmManager = new EnhancedLLMManager();
  
  console.log('\n📊 Configuration Check:\n');
  console.log(`Groq API Key: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`Ollama URL: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
  console.log(`Ollama Primary Model: ${process.env.OLLAMA_PRIMARY_MODEL || 'mistral'}`);
  console.log(`Ollama Fallback Model: ${process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2'}`);
  
  console.log('\n' + '=' .repeat(60));
  
  // Test each message
  for (const test of testMessages) {
    console.log(`\n📝 Test: ${test.description}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Tone: ${test.tone}`);
    console.log('-'.repeat(60));
    
    try {
      const startTime = Date.now();
      const result = await llmManager.generateResponse(test.message, {
        tone: test.tone,
        senderName: 'Test User'
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Success!`);
      console.log(`Model: ${result.model}`);
      console.log(`Response Time: ${duration}ms`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`From Cache: ${result.fromCache ? 'Yes' : 'No'}`);
      console.log(`\nResponse:\n"${result.text}"\n`);
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
    
    console.log('='.repeat(60));
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Display statistics
  console.log('\n📊 LLM Manager Statistics:\n');
  const stats = llmManager.getStats();
  console.log(JSON.stringify(stats, null, 2));
  
  // Display health status
  console.log('\n🏥 Provider Health Status:\n');
  const health = await llmManager.getHealthStatus();
  console.log(JSON.stringify(health, null, 2));
  
  console.log('\n✅ All tests completed!\n');
}

// Run tests
testLLMProviders().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
