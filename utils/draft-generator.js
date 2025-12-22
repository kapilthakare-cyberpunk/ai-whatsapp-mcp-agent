const axios = require('axios');
require('dotenv').config();

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // Can be llama3.2, mistral, phi, etc.
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;

/**
 * Enhanced System Prompts with Context Awareness
 */
const PROMPTS = {
    professional: (conversationHistory, incomingMessage, senderName) => `
You are an AI assistant drafting a PROFESSIONAL WhatsApp reply for the user.

SENDER INFORMATION:
${senderName ? `Sender Name: ${senderName}` : 'Sender: Unknown contact'}

RECENT CONVERSATION CONTEXT:
${conversationHistory || "This is the first message in the conversation."}

INCOMING MESSAGE TO RESPOND TO:
"${incomingMessage}"

YOUR TASK:
Write a professional, context-aware reply that:
1. Acknowledges the specific question/request in their message
2. References previous conversation if relevant
3. Is polite, clear, and business-appropriate
4. Provides helpful information or next steps
5. Maintains a respectful, formal tone
6. Uses proper grammar and punctuation
7. Is concise (2-4 sentences ideal)

CRITICAL RULES:
- Write ONLY the reply message - no preamble like "Here's a draft"
- Do NOT repeat their message back to them
- Do NOT use overly formal greetings unless contextually appropriate
- Match the language they're using (English/Hindi/etc)
- Be specific and helpful, not vague

OUTPUT: Return ONLY the ready-to-send message text.
`,
    personal: (conversationHistory, incomingMessage, senderName) => `
You are an AI assistant drafting a WARM, PERSONAL WhatsApp reply for the user.

SENDER INFORMATION:
${senderName ? `Sender Name: ${senderName}` : 'Sender: Unknown contact'}

RECENT CONVERSATION CONTEXT:
${conversationHistory || "This is the first message in the conversation."}

INCOMING MESSAGE TO RESPOND TO:
"${incomingMessage}"

YOUR TASK:
Write a friendly, warm reply that:
1. Acknowledges what they said in a personal way
2. References previous conversation if relevant  
3. Feels natural and conversational
4. Shows genuine interest and warmth
5. Uses 1-2 emojis if appropriate (but don't overdo it)
6. Matches their energy and tone
7. Is concise but warm (2-4 sentences ideal)

CRITICAL RULES:
- Write ONLY the reply message - no preamble
- Do NOT repeat their message back to them
- Sound like a human friend texting back, not a robot
- Match the language they're using (English/Hindi/etc)
- Be specific and helpful, show you care

OUTPUT: Return ONLY the ready-to-send message text.
`
};

/**
 * Fallback Templates
 */
const FALLBACKS = {
    professional: "Thank you for your message. I'll review this and get back to you shortly.",
    personal: "Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊"
};
/**
 * Generate a draft reply using AI with enhanced context awareness
 */
async function generateDraft({ userId, message, tone = 'professional', context = '', senderName = '' }) {
    const selectedTone = tone.toLowerCase() === 'personal' ? 'personal' : 'professional';
    
    console.log(`\n🤖 Generating ${selectedTone} draft for message: "${message.substring(0, 50)}..."`);
    console.log(`📝 Context length: ${context.length} characters`);
    if (senderName) console.log(`👤 Sender: ${senderName}`);
    
    try {
        const systemPrompt = PROMPTS[selectedTone](context, message, senderName);
        
        // Try Groq first (faster and more reliable)
        if (GROQ_API_KEY) {
            try {
                console.log('🚀 Trying Groq API...');
                const groqResponse = await axios.post(
                    GROQ_URL,
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            {
                                role: "system",
                                content: "You are a helpful WhatsApp reply assistant. Generate concise, context-aware replies."
                            },
                            {
                                role: "user",
                                content: systemPrompt
                            }
                        ],
                        temperature: selectedTone === 'personal' ? 0.8 : 0.4,
                        max_tokens: 250
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GROQ_API_KEY}`
                        },
                        timeout: 6000
                    }
                );

                const generatedText = groqResponse.data.choices[0].message.content.trim();
                const cleanedContent = generatedText.replace(/^"|"$/g, '').replace(/```/g, '');

                console.log('✅ Groq API success!');
                return {
                    success: true,
                    draft: {
                        text: cleanedContent,
                        tone: selectedTone,
                        confidence: 0.92,
                        timestamp: Date.now(),
                        model: 'groq-llama3.3'
                    }
                };
            } catch (groqError) {
                console.warn('⚠️  Groq API failed:', groqError.message);
            }
        }

        // Fallback to Gemini
        if (GEMINI_API_KEY) {
            try {
                console.log('🚀 Trying Gemini API...');
                const geminiPayload = {
                    contents: [{
                        parts: [{ text: systemPrompt }]
                    }],
                    generationConfig: {
                        temperature: selectedTone === 'personal' ? 0.9 : 0.3,
                        maxOutputTokens: 200,
                    }
                };

                const geminiResponse = await axios.post(GEMINI_URL, geminiPayload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 6000
                });

                if (geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const content = geminiResponse.data.candidates[0].content.parts[0].text.trim();
                    const cleanedContent = content.replace(/^"|"$/g, '').replace(/```/g, '');

                    console.log('✅ Gemini API success!');
                    return {
                        success: true,
                        draft: {
                            text: cleanedContent,
                            tone: selectedTone,
                            confidence: 0.9,
                            timestamp: Date.now(),
                            model: 'gemini-2.0-flash'
                        }
                    };
                }
            } catch (geminiError) {
                console.warn('⚠️  Gemini API failed:', geminiError.message);
            }
        }

        // Last resort: Try local Ollama
        try {
            console.log('🚀 Trying local Ollama...');
            const ollamaResponse = await axios.post(
                OLLAMA_URL,
                {
                    model: OLLAMA_MODEL,
                    prompt: systemPrompt,
                    stream: false,
                    options: {
                        temperature: selectedTone === 'personal' ? 0.8 : 0.4,
                        num_predict: 200
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000 // Ollama can be slower on first run
                }
            );

            if (ollamaResponse.data?.response) {
                const cleanedContent = ollamaResponse.data.response.trim().replace(/^"|"$/g, '').replace(/```/g, '');

                console.log(`✅ Ollama success! (model: ${OLLAMA_MODEL})`);
                return {
                    success: true,
                    draft: {
                        text: cleanedContent,
                        tone: selectedTone,
                        confidence: 0.85,
                        timestamp: Date.now(),
                        model: `ollama-${OLLAMA_MODEL}`
                    }
                };
            }
        } catch (ollamaError) {
            console.warn('⚠️  Ollama failed:', ollamaError.message);
            console.log('💡 Tip: Make sure Ollama is running: ollama serve');
        }

        throw new Error('All AI APIs failed');

    } catch (error) {
        console.error('❌ Draft Generation Error:', error.message);
        console.log('📋 Using fallback template');
        
        // Return fallback response
        return {
            success: true,
            draft: {
                text: FALLBACKS[selectedTone],
                tone: selectedTone,
                confidence: 0.5,
                timestamp: Date.now(),
                isFallback: true,
                model: 'fallback'
            }
        };
    }
}
/**
 * Generate comprehensive AI briefing of unread messages
 */
async function generateBriefing(messages) {
    console.log(`\n📊 Generating briefing for ${messages.length} messages...`);
    
    if (messages.length === 0) {
        return {
            success: true,
            summary: "📭 No unread messages to analyze.",
            messageCount: 0
        };
    }

    // Format messages for AI analysis
    const formattedMessages = messages.map((msg, idx) => {
        const sender = msg.senderName || msg.senderId.split('@')[0];
        const time = new Date(msg.timestamp * 1000).toLocaleString();
        const priority = msg.priority || 'normal';
        const text = msg.content?.text || '[No text]';
        
        return `[${idx + 1}] From: ${sender} | ${time} | Priority: ${priority}\nMessage: ${text}`;
    }).join('\n\n');

    const briefingPrompt = `
You are an intelligent message analyst. Analyze these ${messages.length} WhatsApp messages and provide a comprehensive, actionable briefing.

MESSAGES TO ANALYZE:
${formattedMessages}

YOUR TASK:
Create a detailed briefing with these sections:

📊 OVERVIEW
- Total messages: ${messages.length}
- Quick summary of what's happening

🎯 PRIORITY ACTIONS
- List 3-5 most urgent items that need immediate response
- Be specific: "Respond to [Name] about [Topic]"

💼 BUSINESS & WORK
- Business inquiries, deals, professional matters
- Include sender names and key topics

👥 PERSONAL & SOCIAL
- Messages from friends, family, social contacts
- Key topics or requests

⚠️ RED FLAGS
- Potential spam, scams, or suspicious messages
- Unknown numbers with questionable content

📈 INSIGHTS
- Any patterns you notice (multiple people asking same thing?)
- Tone analysis (urgent, casual, frustrated, etc.)
- Recommendations for handling

FORMAT:
- Use clear sections with emojis
- Be specific with names and topics
- Make it scannable and actionable
- Keep it concise but informative

OUTPUT: A well-structured briefing that helps the user quickly understand and prioritize their messages.
`;

    try {
        // Try Groq first
        if (GROQ_API_KEY) {
            try {
                console.log('🚀 Generating briefing with Groq...');
                const response = await axios.post(
                    GROQ_URL,
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: "You are an expert message analyst creating actionable briefings." },
                            { role: "user", content: briefingPrompt }
                        ],
                        temperature: 0.5,
                        max_tokens: 1500
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GROQ_API_KEY}`
                        },
                        timeout: 10000
                    }
                );

                const summary = response.data.choices[0].message.content;
                console.log('✅ Briefing generated successfully with Groq');
                
                return {
                    success: true,
                    summary: summary,
                    messageCount: messages.length,
                    model: 'groq-llama3.3'
                };
            } catch (groqError) {
                console.warn('⚠️  Groq briefing failed:', groqError.message);
            }
        }

        // Fallback to Gemini
        if (GEMINI_API_KEY) {
            try {
                console.log('🚀 Generating briefing with Gemini...');
                const response = await axios.post(
                    GEMINI_URL,
                    {
                        contents: [{ parts: [{ text: briefingPrompt }] }],
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 1500
                        }
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000
                    }
                );

                if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const summary = response.data.candidates[0].content.parts[0].text;
                    console.log('✅ Briefing generated successfully with Gemini');
                    
                    return {
                        success: true,
                        summary: summary,
                        messageCount: messages.length,
                        model: 'gemini-2.0-flash'
                    };
                }
            } catch (geminiError) {
                console.warn('⚠️  Gemini briefing failed:', geminiError.message);
            }
        }

        // Last resort: Try local Ollama
        try {
            console.log('🚀 Generating briefing with local Ollama...');
            const response = await axios.post(
                OLLAMA_URL,
                {
                    model: OLLAMA_MODEL,
                    prompt: briefingPrompt,
                    stream: false,
                    options: {
                        temperature: 0.5,
                        num_predict: 1500
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000 // Briefing needs more time
                }
            );

            if (response.data?.response) {
                const summary = response.data.response.trim();
                console.log(`✅ Briefing generated successfully with Ollama (model: ${OLLAMA_MODEL})`);
                
                return {
                    success: true,
                    summary: summary,
                    messageCount: messages.length,
                    model: `ollama-${OLLAMA_MODEL}`
                };
            }
        } catch (ollamaError) {
            console.warn('⚠️  Ollama briefing failed:', ollamaError.message);
            console.log('💡 Tip: Make sure Ollama is running with a model installed');
        }

        throw new Error('All AI APIs failed for briefing');

    } catch (error) {
        console.error('❌ Briefing generation error:', error.message);
        
        // Generate basic categorized summary as fallback
        return generateFallbackBriefing(messages);
    }
}

/**
 * Fallback briefing using simple categorization
 */
function generateFallbackBriefing(messages) {
    console.log('📋 Generating fallback briefing...');
    
    const categories = {
        business: [],
        personal: [],
        unknown: [],
        urgent: []
    };

    // Simple keyword-based categorization
    const businessKeywords = ['business', 'sale', 'buy', 'price', 'order', 'inquiry', 'deal'];
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'important'];

    messages.forEach(msg => {
        const text = (msg.content?.text || '').toLowerCase();
        const sender = msg.senderName || msg.senderId.split('@')[0];
        
        if (urgentKeywords.some(kw => text.includes(kw))) {
            categories.urgent.push({ sender, text: msg.content?.text });
        } else if (businessKeywords.some(kw => text.includes(kw))) {
            categories.business.push({ sender, text: msg.content?.text });
        } else if (msg.senderName) {
            categories.personal.push({ sender, text: msg.content?.text });
        } else {
            categories.unknown.push({ sender, text: msg.content?.text });
        }
    });

    let summary = `📊 MESSAGE BRIEFING\n\n`;
    summary += `Total Messages: ${messages.length}\n\n`;

    if (categories.urgent.length > 0) {
        summary += `⚠️  URGENT (${categories.urgent.length})\n`;
        categories.urgent.slice(0, 3).forEach(m => {
            summary += `• ${m.sender}: ${m.text.substring(0, 80)}...\n`;
        });
        summary += `\n`;
    }

    if (categories.business.length > 0) {
        summary += `💼 BUSINESS (${categories.business.length})\n`;
        categories.business.slice(0, 3).forEach(m => {
            summary += `• ${m.sender}: ${m.text.substring(0, 80)}...\n`;
        });
        summary += `\n`;
    }

    if (categories.personal.length > 0) {
        summary += `👥 PERSONAL (${categories.personal.length})\n`;
        categories.personal.slice(0, 3).forEach(m => {
            summary += `• ${m.sender}: ${m.text.substring(0, 80)}...\n`;
        });
        summary += `\n`;
    }

    if (categories.unknown.length > 0) {
        summary += `❓ UNKNOWN CONTACTS (${categories.unknown.length})\n`;
        categories.unknown.slice(0, 3).forEach(m => {
            summary += `• ${m.sender}: ${m.text.substring(0, 80)}...\n`;
        });
    }

    return {
        success: true,
        summary: summary,
        messageCount: messages.length,
        model: 'fallback-categorization'
    };
}

module.exports = { generateDraft, generateBriefing };