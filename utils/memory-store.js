/**
 * Enhanced file-based memory store for WhatsApp conversations with monitoring
 * Uses JSON file to persist memories between sessions
 */
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor(filePath = './whatsapp_memories.json', monitorFilePath = './whatsapp_monitoring.json') {
    this.filePath = filePath;
    this.monitorFilePath = monitorFilePath;
    this.memories = new Map();
    this.monitoringData = new Map();
    this.detectedTasks = new Map(); // Store auto-detected tasks
    this.dismissedThreads = new Set(); // Track dismissed threads (JID-based)
    this.ensureFileExists();
    this.ensureMonitoringFileExists();
  }

  async ensureFileExists() {
    try {
      await fs.access(this.filePath);
      const data = await fs.readFile(this.filePath, 'utf8');
      this.memories = new Map(JSON.parse(data));
    } catch (error) {
      // File doesn't exist, create a new one
      await this.saveMemories();
    }
  }

  async ensureMonitoringFileExists() {
    try {
      await fs.access(this.monitorFilePath);
      const data = await fs.readFile(this.monitorFilePath, 'utf8');
      this.monitoringData = new Map(JSON.parse(data));
    } catch (error) {
      // File doesn't exist, create a new one
      await this.saveMonitoringData();
    }
  }

  async saveMonitoringData() {
    const serializedData = Array.from(this.monitoringData.entries());
    await fs.writeFile(this.monitorFilePath, JSON.stringify(serializedData, null, 2));
  }

  async saveMemories() {
    const serializedMemories = Array.from(this.memories.entries());
    await fs.writeFile(this.filePath, JSON.stringify(serializedMemories, null, 2));
  }

  async addMemory(userId, conversationId, message, metadata = {}) {
    const memoryId = uuidv4();
    const memory = {
      id: memoryId,
      userId,
      conversationId,
      message,
      timestamp: Date.now(),
      metadata
    };

    // Create user memories array if it doesn't exist
    const userKey = `${userId}:${conversationId}`;
    if (!this.memories.has(userKey)) {
      this.memories.set(userKey, []);
    }

    // Add memory to user's conversation
    this.memories.get(userKey).push(memory);

    // Keep only recent memories (limit to 50 per conversation to prevent memory bloat)
    if (this.memories.get(userKey).length > 50) {
      const trimmedMemories = this.memories.get(userKey).slice(-50);
      this.memories.set(userKey, trimmedMemories);
    }

    await this.saveMemories();
    return memoryId;
  }

  async addMonitoredMessage(messageData) {
    const messageId = messageData.id || uuidv4();
    const monitoredMessage = {
      id: messageId,
      timestamp: Date.now(),
      monitoredAt: Date.now(),
      unread: messageData.unread !== undefined ? messageData.unread : true, // Default to unread for monitored messages
      ...messageData
    };

    // Add to monitoring data
    if (!this.monitoringData.has('messages')) {
      this.monitoringData.set('messages', []);
    }

    this.monitoringData.get('messages').push(monitoredMessage);

    // Keep only recent monitoring data (limit to 1000 entries to prevent file bloat)
    if (this.monitoringData.get('messages').length > 1000) {
      const trimmedMessages = this.monitoringData.get('messages').slice(-1000);
      this.monitoringData.set('messages', trimmedMessages);
    }

    await this.saveMonitoringData();
    return messageId;
  }

  async getUnreadMessages(limit = 50) {
    const allMessages = this.monitoringData.get('messages') || [];
    
    // Filter out messages from dismissed threads
    const unreadMessages = allMessages
      .filter(msg => {
        // Must be unread
        if (!msg.unread) return false;
        
        // Get the thread ID (group or individual)
        const threadId = msg.isGroupMessage ? msg.groupId : msg.senderId;
        
        // Check if this thread has been dismissed
        return !this.dismissedThreads.has(threadId);
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return unreadMessages;
  }

  async dismissThread(threadId) {
    // Add thread to dismissed set
    this.dismissedThreads.add(threadId);
    console.log(`✅ Thread ${threadId} dismissed from preview`);
  }

  async undismissThread(threadId) {
    // Remove thread from dismissed set
    this.dismissedThreads.delete(threadId);
    console.log(`✅ Thread ${threadId} restored to preview`);
  }

  async getDismissedThreads() {
    return Array.from(this.dismissedThreads);
  }

  async markAsRead(messageIds) {
    const allMessages = this.monitoringData.get('messages') || [];
    let updatedCount = 0;

    // Create a set for faster lookup if multiple IDs
    const idsToMark = new Set(Array.isArray(messageIds) ? messageIds : [messageIds]);

    // Track threads that should be dismissed
    const threadsToProcess = new Set();

    allMessages.forEach(msg => {
      if (idsToMark.has(msg.id) || idsToMark.has(msg.messageId)) { // Check both internal ID and WhatsApp Message ID
        if (msg.unread) {
          msg.unread = false;
          updatedCount++;
          
          // Track the thread for dismissal
          const threadId = msg.isGroupMessage ? msg.groupId : msg.senderId;
          threadsToProcess.add(threadId);
        }
      }
    });

    // Dismiss threads that have ALL messages marked as read
    for (const threadId of threadsToProcess) {
      // Check if thread has any remaining unread messages
      const hasUnread = allMessages.some(msg => {
        const msgThreadId = msg.isGroupMessage ? msg.groupId : msg.senderId;
        return msgThreadId === threadId && msg.unread;
      });

      // If no unread messages remain, dismiss the thread
      if (!hasUnread) {
        await this.dismissThread(threadId);
      }
    }

    if (updatedCount > 0) {
      await this.saveMonitoringData();
    }
    
    return updatedCount;
  }

  async getMonitoredMessages(limit = 50, offset = 0) {
    const allMessages = this.monitoringData.get('messages') || [];
    const sortedMessages = allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);

    return sortedMessages;
  }

  async getMonitoredMessagesByType(messageType, limit = 50) {
    const allMessages = this.monitoringData.get('messages') || [];
    const filteredMessages = allMessages
      .filter(msg => msg.type === messageType)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return filteredMessages;
  }

  async getMonitoredMessagesByUser(userId, limit = 50) {
    const allMessages = this.monitoringData.get('messages') || [];
    const filteredMessages = allMessages
      .filter(msg => msg.senderId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return filteredMessages;
  }

  async getMonitoredMessagesByGroup(groupId, limit = 50) {
    const allMessages = this.monitoringData.get('messages') || [];
    const filteredMessages = allMessages
      .filter(msg => msg.groupId === groupId && msg.isGroupMessage === true)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return filteredMessages;
  }

  async getMonitoringStats() {
    const allMessages = this.monitoringData.get('messages') || [];

    if (allMessages.length === 0) {
      return {
        totalMessages: 0,
        lastMonitored: null,
        groupMessages: 0,
        individualMessages: 0,
        messageTypes: {},
        dailyStats: {}
      };
    }

    // Calculate statistics
    const stats = {
      totalMessages: allMessages.length,
      lastMonitored: new Date(Math.max(...allMessages.map(m => m.timestamp))).toISOString(),
      groupMessages: allMessages.filter(m => m.isGroupMessage).length,
      individualMessages: allMessages.filter(m => !m.isGroupMessage).length,
      messageTypes: {},
      dailyStats: {}
    };

    // Calculate message types
    allMessages.forEach(msg => {
      const type = msg.type || 'unknown';
      stats.messageTypes[type] = (stats.messageTypes[type] || 0) + 1;
    });

    // Calculate daily stats
    allMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toDateString();
      if (!stats.dailyStats[date]) {
        stats.dailyStats[date] = { count: 0, groups: 0, individuals: 0 };
      }
      stats.dailyStats[date].count++;
      if (msg.isGroupMessage) {
        stats.dailyStats[date].groups++;
      } else {
        stats.dailyStats[date].individuals++;
      }
    });

    return stats;
  }

  async getMemories(userId, conversationId, limit = 10) {
    const userKey = `${userId}:${conversationId}`;
    const userMemories = this.memories.get(userKey) || [];
    
    // Return most recent memories
    return userMemories
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async searchMemories(userId, conversationId, query, limit = 5) {
    const userKey = `${userId}:${conversationId}`;
    const userMemories = this.memories.get(userKey) || [];
    
    // Simple search in message content
    const matches = userMemories.filter(memory => 
      memory.message.toLowerCase().includes(query.toLowerCase())
    );
    
    return matches
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getConversationContext(userId, conversationId, limit = 5) {
    const memories = await this.getMemories(userId, conversationId, limit);
    return memories.map(mem => mem.message).join('\n');
  }

  async addEntity(userId, entityData) {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }

    const entityMemory = {
      id: uuidv4(),
      userId,
      type: 'entity',
      data: entityData,
      timestamp: Date.now()
    };

    this.memories.get(userId).push(entityMemory);
    await this.saveMemories();
    return entityMemory.id;
  }

  async getEntity(userId, entityType) {
    const userMemories = this.memories.get(userId) || [];
    const entityMemories = userMemories.filter(memory =>
      memory.type === 'entity' && memory.data.type === entityType
    );

    return entityMemories.length > 0 ? entityMemories[entityMemories.length - 1].data : null;
  }

  async getConversationSummary(userId) {
    const userKey = `${userId}:whatsapp_conversation`;
    const userMemories = this.memories.get(userKey) || [];

    if (userMemories.length === 0) {
      return {
        totalMessages: 0,
        firstMessage: null,
        lastMessage: null,
        activeDays: 0
      };
    }

    const sortedMemories = userMemories.sort((a, b) => a.timestamp - b.timestamp);
    const firstMessage = sortedMemories[0];
    const lastMessage = sortedMemories[sortedMemories.length - 1];

    // Calculate unique days of activity
    const uniqueDays = new Set();
    sortedMemories.forEach(memory => {
      const date = new Date(memory.timestamp).toDateString();
      uniqueDays.add(date);
    });

    return {
      totalMessages: userMemories.length,
      firstMessage: firstMessage.message,
      lastMessage: lastMessage.message,
      activeDays: uniqueDays.size
    };
  }

  async getUserPreferences(userId) {
    const userKey = `${userId}:whatsapp_conversation`;
    const userMemories = this.memories.get(userKey) || [];

    const preferences = {
      topics: [],
      interests: [],
      commonWords: [],
      responsePatterns: []
    };

    // Extract patterns from conversation
    const allMessages = userMemories.map(m => m.message.toLowerCase());
    const allText = allMessages.join(' ');

    // Simple keyword extraction (in a real implementation,
    // this would use more sophisticated NLP)
    const words = allText.split(/\W+/).filter(w => w.length > 4);
    const wordCount = {};

    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get most common words
    const sortedWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    preferences.commonWords = sortedWords;
    preferences.topics = sortedWords.slice(0, 5);

    return preferences;
  }

  async getConversationHistory(userId, limit = 20) {
    const userKey = `${userId}:whatsapp_conversation`;
    const userMemories = this.memories.get(userKey) || [];

    // Return the most recent messages
    return userMemories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Task Detection Storage Methods
  async addDetectedTask(taskData) {
    const taskId = taskData.messageId + '_task_' + Date.now();
    const detectedTask = {
      id: taskId,
      detectedAt: Date.now(),
      ...taskData
    };

    if (!this.detectedTasks.has('tasks')) {
      this.detectedTasks.set('tasks', []);
    }

    this.detectedTasks.get('tasks').push(detectedTask);

    // Keep only recent tasks (limit to 500)
    if (this.detectedTasks.get('tasks').length > 500) {
      const trimmedTasks = this.detectedTasks.get('tasks').slice(-500);
      this.detectedTasks.set('tasks', trimmedTasks);
    }

    console.log(`📝 Stored detected task: "${taskData.task.task}" from ${taskData.senderName}`);
    return taskId;
  }

  async getDetectedTasks(limit = 50) {
    const allTasks = this.detectedTasks.get('tasks') || [];
    return allTasks
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, limit);
  }

  async getDetectedTasksBySender(senderId, limit = 20) {
    const allTasks = this.detectedTasks.get('tasks') || [];
    return allTasks
      .filter(t => t.senderId === senderId)
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, limit);
  }
}

module.exports = MemoryStore;