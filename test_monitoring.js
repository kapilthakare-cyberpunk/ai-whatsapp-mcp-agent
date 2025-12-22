const MemoryStore = require('./utils/memory-store');

async function testMonitoring() {
  console.log('Testing monitoring functionality...');
  
  // Create a new memory store instance
  const store = new MemoryStore();
  
  // Test adding a monitored message
  const messageData = {
    id: 'test-message-1',
    senderId: '1234567890@c.us',
    senderName: 'Test User',
    type: 'text',
    content: { type: 'text', text: 'Hello from individual chat!' },
    timestamp: Date.now(),
    isGroupMessage: false,
    groupId: null,
    groupName: null,
    messageId: 'test-message-1'
  };
  
  console.log('Adding individual message to monitoring...');
  await store.addMonitoredMessage(messageData);
  
  // Wait a moment to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 10));

  // Test adding a group message
  const groupMessageData = {
    id: 'test-message-2',
    senderId: '9876543210@c.us',
    senderName: 'Group User',
    type: 'text',
    content: { type: 'text', text: 'Hello from group chat!' },
    timestamp: Date.now(),
    isGroupMessage: true,
    groupId: '123456789@g.us',
    groupName: 'Test Group',
    messageId: 'test-message-2'
  };
  
  console.log('Adding group message to monitoring...');
  await store.addMonitoredMessage(groupMessageData);
  
  // Test retrieving monitored messages
  console.log('\n--- Retrieving all monitored messages ---');
  const allMessages = await store.getMonitoredMessages();
  console.log(`Retrieved ${allMessages.length} messages`);
  allMessages.forEach(msg => {
    console.log(`- ${msg.senderName}: ${msg.content.text} (Group: ${msg.isGroupMessage})`);
  });
  
  // Test retrieving by type
  console.log('\n--- Retrieving text messages only ---');
  const textMessages = await store.getMonitoredMessagesByType('text');
  console.log(`Found ${textMessages.length} text messages`);
  
  // Test retrieving by user
  console.log('\n--- Retrieving messages by user ---');
  const userMessages = await store.getMonitoredMessagesByUser('1234567890@c.us');
  console.log(`Found ${userMessages.length} messages from test user`);
  
  // Test retrieving by group
  console.log('\n--- Retrieving messages by group ---');
  const groupMessages = await store.getMonitoredMessagesByGroup('123456789@g.us');
  console.log(`Found ${groupMessages.length} messages from test group`);
  
  // Test stats
  console.log('\n--- Getting monitoring stats ---');
  const stats = await store.getMonitoringStats();
  console.log('Stats:', JSON.stringify(stats, null, 2));
  
  console.log('\nMonitoring functionality test completed successfully!');
}

// Run the test
testMonitoring().catch(console.error);