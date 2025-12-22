# WhatsApp Reply Draft Generator - Quick Action System

## Overview
This document describes the **ready-to-send reply generation system** for WhatsApp messages. Users can generate instant, contextually-aware replies with a single button press, choosing between two distinct tones.

---

## Design Philosophy

### Core Principle: **Instant, Send-Ready Responses**
- Users press one button → AI generates reply → User sends immediately
- **No editing required** - drafts should be perfect on the first try
- **No boilerplate** - every draft is a natural, human-sounding response
- **Contextual awareness** - AI understands conversation history

---

## Button Interface

### Two Quick-Action Buttons

| Button | Tone | When to Use | Key Characteristics |
|--------|------|-------------|---------------------|
| **1. Professional** | Formal, Business-Appropriate | Client inquiries, business deals, formal complaints, vendor communications | Polite, concise, grammatically perfect, no emojis, respectful |
| **2. Personal & Warm** | Friendly, Conversational | Friends, family, regular clients, casual updates | Warm, engaging, uses emojis sparingly, conversational tone |

---

## Technical Implementation

### API Endpoint
**File:** `utils/draft-generator.js`  
**Model:** Google Gemini 2.0 Flash  
**Endpoint:** `POST /process-ai`

### System Prompt (Professional)
```javascript
const professionalPrompt = `
You are drafting a professional WhatsApp reply on behalf of a user.

CONVERSATION CONTEXT:
${conversationHistory}

INCOMING MESSAGE:
"${incomingMessage}"

INSTRUCTIONS:
1. Write ONLY the reply message - nothing else
2. Be polite, concise, and professional
3. Do NOT include greetings like "Dear Sir/Madam" unless contextually appropriate
4. Do NOT repeat the original message
5. Do NOT add explanations or meta-commentary
6. Match the language of the incoming message
7. Keep it brief but complete
8. Use proper grammar and punctuation

OUTPUT: Return ONLY the ready-to-send message text.
`;
```

### System Prompt (Personal & Warm)
```javascript
const personalPrompt = `
You are drafting a friendly, warm WhatsApp reply on behalf of a user.

CONVERSATION CONTEXT:
${conversationHistory}

INCOMING MESSAGE:
"${incomingMessage}"

INSTRUCTIONS:
1. Write ONLY the reply message - nothing else
2. Be warm, friendly, and conversational
3. Use 1-2 emojis if appropriate (but don't overdo it)
4. Keep it natural and casual
5. Do NOT repeat the original message
6. Do NOT add explanations or meta-commentary
7. Match the language and energy of the incoming message
8. Sound like a human friend texting back

OUTPUT: Return ONLY the ready-to-send message text.
`;
```

---

## Response Format

### API Response Structure
```json
{
  "success": true,
  "draft": {
    "text": "The ready-to-send message",
    "tone": "professional" | "personal",
    "confidence": 0.9,
    "timestamp": 1234567890
  }
}
```

### Key Rules
- **NO markdown** in the response (no ```json blocks)
- **NO preamble** like "Here's a draft..."
- **NO meta-commentary** like "This is professional because..."
- **ONLY the message text** that can be sent as-is

---

## Context Handling

### Conversation History
The system fetches the last **5 messages** from the thread to provide context:

```javascript
const conversationHistory = await fetchLastMessages(userId, limit=5);
// Format: "User: [message]\nThem: [message]\n..."
```

### Context Priority
1. **Recent messages** (last 3-5 exchanges)
2. **Sender's name** and relationship (if available)
3. **Message priority** (urgent flags)
4. **Urgency indicators** (keywords like "urgent", "ASAP")

---

## Example Scenarios

### Scenario 1: Business Inquiry
**Incoming:** "Hi, I'm interested in your rental properties. Do you have any 2BHK available in Nagpur?"

**Professional Reply:**  
"Thank you for your interest! Yes, we have several 2BHK properties available in Nagpur. I'd be happy to share the details and schedule a viewing. When would be a convenient time for you?"

**Personal & Warm Reply:**  
"Hey! 😊 Yes, we've got some great 2BHK options in Nagpur! I can send you the details right away. When are you free to check them out?"

---


### Scenario 2: Friend Checking In
**Incoming:** "Hey dude, long time! How have you been?"

**Professional Reply:**  
"Hello! It's been a while. I've been well, thank you. How about you? Let's catch up soon."

**Personal & Warm Reply:**  
"Hey! I know right, it's been ages! 😄 I've been good, busy with work but can't complain. How about you? We should definitely catch up soon!"

---


### Scenario 3: Client Follow-up
**Incoming:** "Any update on the payment I made last week?"

**Professional Reply:**  
"Thank you for following up. I'm checking on the status of your payment and will get back to you within the next 2 hours with an update."

**Personal & Warm Reply:**  
"Hey! Thanks for checking in. Let me look into that payment for you and I'll get back to you in a bit with an update 👍"

---

## Fallback Mechanism

### When AI Fails
If the Gemini API is unavailable, use these template-based responses:

```javascript
// Professional Fallback
`Thank you for your message. I'll review this and get back to you shortly.`

// Personal Fallback  
`Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊`
```

### Error Handling
- **Rate Limits:** Queue the request and retry after 2 seconds
- **Network Errors:** Show fallback templates immediately
- **Invalid API Key:** Log warning, use fallback templates
- **Empty Response:** Regenerate with simplified prompt

---

## Quality Assurance

### Pre-Send Checks
Before showing a draft to the user:
1. ✅ Contains actual reply content (not empty)
2. ✅ No boilerplate phrases like "Here's a draft..."
3. ✅ No repetition of the original message
4. ✅ Matches requested tone (professional vs personal)
5. ✅ Under 500 characters (WhatsApp best practice)
6. ✅ No markdown or formatting artifacts

### Confidence Scoring
```javascript
confidence = {
  high: 0.9,    // Clear context, straightforward reply
  medium: 0.7,  // Some ambiguity, general response
  low: 0.5      // Fallback templates, insufficient context
}
```

---

## Frontend Integration

### Button Implementation
```jsx
<div className="flex gap-2">
  <button 
    onClick={() => generateDraft(thread, 'professional')}
    className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
  >
    1️⃣ Professional
  </button>
  
  <button 
    onClick={() => generateDraft(thread, 'personal')}
    className="flex-1 bg-green-600 text-white py-2 rounded-lg"
  >
    2️⃣ Personal & Warm
  </button>
</div>
```

### Draft Display
```jsx
{draft && (
  <div className="bg-gray-50 p-3 rounded-lg border">
    <p className="text-sm mb-2">{draft.text}</p>
    <div className="flex gap-2">
      <button onClick={() => editDraft(draft)}>✏️ Edit</button>
      <button onClick={() => sendDraft(draft)}>📤 Send</button>
    </div>
  </div>
)}
```

---

## Performance Optimization

### Response Time Targets
- **API Call:** < 2 seconds
- **Total Time:** < 3 seconds (including UI update)
- **Fallback:** < 100ms (instant)

### Caching Strategy
- Cache conversation history (5 minutes TTL)
- Don't cache drafts (always generate fresh)
- Cache sender metadata (name, relationship)

### Load Management
- Max 5 concurrent draft generations
- Queue additional requests
- Show loading indicator after 1 second

---

## Future Enhancements

### Phase 2 Features
1. **Smart Templates**: Learn from sent messages to improve future drafts
2. **Multi-language Support**: Auto-detect language and respond accordingly
3. **Tone Learning**: Learn user's preferred phrasing over time
4. **Quick Actions**: "Accept", "Decline", "Schedule" buttons for common scenarios
5. **Voice-to-Text**: Generate drafts from voice messages

### Phase 3 Features
1. **Business Context Injection**: Pull from company FAQ/knowledge base
2. **Sentiment Analysis**: Detect frustration, urgency, excitement in incoming messages
3. **Draft Variations**: Generate 2-3 options per tone
4. **Custom Tones**: Add "Urgent", "Brief", "Detailed" options

---

## Monitoring & Analytics

### Track These Metrics
- **Generation Success Rate**: % of successful draft generations
- **User Send Rate**: % of drafts actually sent (vs edited/discarded)
- **Tone Preference**: Which tone users prefer per contact type
- **Response Time**: Average time to generate draft
- **Edit Rate**: How often users edit before sending

### Success Criteria
- ✅ **80%+ Send Rate**: Users send drafts without editing
- ✅ **< 2s Response Time**: Fast enough to feel instant
- ✅ **95%+ Uptime**: Fallback handles API failures gracefully

---

## API Specification

### Generate Professional Draft
```bash
POST /api/generate-draft
Content-Type: application/json

{
  "userId": "919876543210@s.whatsapp.net",
  "message": "What\'s the status of my order?",
  "tone": "professional",
  "context": "optional - last 5 messages"
}

Response:
{
  "success": true,
  "draft": {
    "text": "Thank you for following up. I\'m checking your order status now and will update you within 30 minutes.",
    "tone": "professional",
    "confidence": 0.92
  }
}
```

### Generate Personal Draft
```bash
POST /api/generate-draft
Content-Type: application/json

{
  "userId": "919876543210@s.whatsapp.net", 
  "message": "What\'s the status of my order?",
  "tone": "personal",
  "context": "optional - last 5 messages"
}

Response:
{
  "success": true,
  "draft": {
    "text": "Hey! Let me check on your order for you right now and I\'ll get back to you in a few minutes 👍",
    "tone": "personal",
    "confidence": 0.88
  }
}
```

---

## Security & Privacy

### Data Handling
- **Never store** generated drafts permanently
- **Context window**: Only last 5 messages (10 minutes)
- **No logging** of sensitive personal information
- **Rate limiting**: 30 requests per user per minute

### API Key Management
- Store Gemini API key in environment variables
- Never expose key in frontend
- Rotate keys quarterly
- Monitor usage to prevent abuse

---

## Troubleshooting

### Common Issues

**Issue:** Drafts include "Here's a professional response..."  
**Fix:** Update system prompt to explicitly forbid preambles

**Issue:** Drafts repeat the original message  
**Fix:** Add "Do NOT repeat the original message" instruction

**Issue:** Response too slow (>5 seconds)  
**Fix:** Check API latency, implement request timeout

**Issue:** Drafts sound too robotic  
**Fix:** Lower temperature to 0.8, add more conversational examples

**Issue:** Wrong language in response  
**Fix:** Add explicit language detection and matching

---

## Development Checklist

### Before Launch
- [ ] Test both tones with 10+ real message examples
- [ ] Verify fallback system works without API key
- [ ] Measure average response time (target: <2s)
- [ ] Test with different languages (Hindi, English)
- [ ] Ensure no PII leakage in logs
- [ ] Add rate limiting
- [ ] Set up error monitoring
- [ ] Create user documentation

### Post-Launch Monitoring
- [ ] Track send vs. edit rate
- [ ] Monitor API costs
- [ ] Collect user feedback
- [ ] A/B test prompt variations
- [ ] Analyze tone preferences by contact type

---

## Conclusion

This system is designed for **speed and simplicity**: 
1. User gets message
2. User presses button (1 or 2)
3. AI generates perfect reply
4. User sends immediately

**No editing. No thinking. Just press and send.**

The success of this system depends on the AI generating replies that are so good, users trust them enough to send without modification. Every improvement should focus on increasing that trust and reducing the need for manual edits.
