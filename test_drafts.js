const { generateDraft } = require('./utils/draft-generator');

async function testDraftGeneration() {
  console.log('Testing draft response generation (New System)...\n');
  
  // Test Data
  const userId = "1234567890@s.whatsapp.net";
  const incomingMessage = "Can you help me prepare for the client presentation next week?";
  const context = "User: We discussed the quarterly results yesterday.\nThem: Okay, I'll send the data.";
  
  console.log('Input Message:', incomingMessage);
  console.log('Context:', context);
  console.log('------------------\n');

  // Test 1: Professional Tone
  console.log('Test 1: Generating Professional Draft...');
  const profResult = await generateDraft({
    userId,
    message: incomingMessage,
    tone: 'professional',
    context
  });

  if (profResult.success) {
    console.log(`[${profResult.draft.tone.toUpperCase()}] Confidence: ${profResult.draft.confidence}`);
    console.log(`Response: ${profResult.draft.text}`);
    console.log(`Is Fallback: ${!!profResult.draft.isFallback}`);
  } else {
    console.error('Professional draft generation failed');
  }
  console.log('');

  // Test 2: Personal Tone
  console.log('Test 2: Generating Personal Draft...');
  const persResult = await generateDraft({
    userId,
    message: incomingMessage,
    tone: 'personal',
    context
  });

  if (persResult.success) {
    console.log(`[${persResult.draft.tone.toUpperCase()}] Confidence: ${persResult.draft.confidence}`);
    console.log(`Response: ${persResult.draft.text}`);
    console.log(`Is Fallback: ${!!persResult.draft.isFallback}`);
  } else {
    console.error('Personal draft generation failed');
  }
  console.log('');

  // Test 3: Fallback (Simulation by empty key if I could, but here just checking structure)
  // We can't easily force error without mocking, but we can verify the structure of previous results
  
  if (profResult.draft.text && persResult.draft.text) {
    console.log('✓ Successfully generated drafts for both tones');
  } else {
    console.log('✗ Failed to generate drafts');
  }

  if (profResult.draft.text !== persResult.draft.text) {
     console.log('✓ Drafts are different for different tones');
  } else {
     console.log('? Drafts are identical (might happen if model falls back or context is strong)');
  }
}

// Run the test
testDraftGeneration().catch(console.error);
