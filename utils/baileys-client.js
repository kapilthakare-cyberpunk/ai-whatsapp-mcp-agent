const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const SQLiteDatabase = require('./sqlite-database');

class BaileysWhatsAppClient {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.qrCallback = null;
    this.currentQR = null;
    this.lastPrintedQR = null;
    this.authState = null;
    this.db = new SQLiteDatabase();
    this.taskManager = null; // Will be injected from server.js
    this.chatCache = new Map();
    this.lastMessageByChat = new Map();
    this.autoBackfillEnabled = false;
    this.autoBackfillStarted = false;
    this.backfillInProgress = false;
    this.autoBackfillConfig = {
      chatLimit: 100,
      messagesPerChat: 35,
      delayMs: 250
    };
    this.messageCallback = null;
  }

  normalizeTimestamp(value) {
    if (value === null || value === undefined) return Date.now();
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Date.now();
    }
    if (typeof value === 'object') {
      if (typeof value.toNumber === 'function') return value.toNumber();
      if (typeof value.toString === 'function') {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : Date.now();
      }
    }
    return Date.now();
  }

  // Method to inject TaskManager from server.js
  setTaskManager(taskManager) {
    this.taskManager = taskManager;
  }

  setMessageCallback(callback) {
    this.messageCallback = callback;
  }

  async initialize() {
    try {
      // Initialize the SQLite database
      await this.db.initialize();

      const autoBackfillSetting = process.env.AUTO_BACKFILL_ON_STARTUP || 'true';
      const autoBackfillFlag = autoBackfillSetting !== 'false';
      const forceBackfill = autoBackfillSetting === 'force';
      const totalMessages = await this.db.getTotalMessagesCount();
      this.autoBackfillEnabled = forceBackfill || (autoBackfillFlag && totalMessages === 0);
      
      // Initialize auth state separately
      const { state, saveCreds } = await useMultiFileAuthState('./baileys_store_multi');
      this.authState = { state, saveCreds };

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR codes ourselves
        browser: ['Qwen MCP Server', 'Safari', '1.0.0'],
        syncFullHistory: this.autoBackfillEnabled
      });

      this.setupConnectionHandlers();
      return this.sock;
    } catch (error) {
      console.error('Error initializing Baileys client:', error);
      throw error;
    }
  }

  async logoutAndClearSession() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (error) {
      console.warn('Logout call failed, continuing to clear session:', error.message);
    }

    this.isReady = false;
    this.currentQR = null;
    this.lastPrintedQR = null;
    this.sock = null;
    this.authState = null;

    const sessionDir = path.join(process.cwd(), 'baileys_store_multi');
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to remove session directory:', error.message);
    }
  }

  setupConnectionHandlers() {
    this.sock.ev.process(async (events) => {
      // Connection update
      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

        if (qr) {
          // Store the QR code for API access
          this.currentQR = qr;
          if (this.lastPrintedQR !== qr) {
            this.lastPrintedQR = qr;
            console.log('\nScan this QR code with WhatsApp:');
            console.log('-----------------------------------');
            qrcode.generate(qr, { small: true });
            console.log('-----------------------------------');
          }

          // Call the QR callback if available
          if (this.qrCallback) {
            this.qrCallback(qr);
          }
        }

        if (connection === 'close') {
          console.log('Connection closed. Reconnecting...');
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          
          // In both cases (reconnect or logged out), we need to re-initialize the socket
          // to either restore the session or generate a new QR code.
          if (shouldReconnect) {
            console.log('Attempting to reconnect...');
          } else {
            console.log('Logged out. Please scan QR code again to reconnect.');
            this.isReady = false;
          }
          
          // Re-initialize to restore connection or start fresh
          // We add a small delay to prevent tight loops in case of persistent errors
          setTimeout(() => {
            this.initialize().catch(err => console.error('Failed to re-initialize:', err));
          }, 2000); // 2 second delay
        } else if (connection === 'open') {
          console.log('Connected to WhatsApp Web!');
          this.isReady = true;
          this.currentQR = null; // Clear QR code on success
          if (this.autoBackfillEnabled && !this.autoBackfillStarted) {
            this.autoBackfillStarted = true;
            this.scheduleAutoBackfill();
          }
        }
      }

      // Authentication update
      if (events['creds.update'] && this.authState) {
        await this.authState.saveCreds();
      }

      // Messages update
      if (events['messages.upsert']) {
        const { messages } = events['messages.upsert'];
        for (const msg of messages) {
          this.updateChatCacheFromMessage(msg);
          await this.handleIncomingMessage(msg);
        }
      }

      if (events['chats.set']) {
        this.upsertChats(events['chats.set'].chats || []);
      }

      if (events['chats.upsert']) {
        this.upsertChats(events['chats.upsert'] || []);
      }

      if (events['chats.update']) {
        this.updateChats(events['chats.update'] || []);
      }

      if (events['messaging-history.set']) {
        await this.ingestHistorySync(events['messaging-history.set']);
      }
    });
  }

  detectUrgency(text) {
    if (!text) return 'normal';
    const lowerText = text.toLowerCase();

    // 1. NEGATIVE FILTERS: Explicitly non-urgent phrases
    const nonUrgentPhrases = [
      'no rush', 'not urgent', 'take your time', 'whenever you can', 'no hurry', 
      'later', 'next week', 'sometime'
    ];
    if (nonUrgentPhrases.some(phrase => lowerText.includes(phrase))) {
      return 'normal';
    }
    
    // 2. HIGH PRIORITY KEYWORDS
    const urgentKeywords = [
      'urgent', 'asap', 'emergency', 'immediately', 'immediate', 
      'help', 'blocked', 'stuck', 'issue', 'critical', 'fatal',
      'payment pending', 'payment failed', 'deadline'
    ];

    // 3. TIME-SENSITIVE PATTERNS (Regex for higher accuracy)
    const timePatterns = [
      /need.*by\s+(today|tomorrow|tonight|now)/i,
      /send.*(now|immediately)/i,
      /call.*me/i,
      /pickup.*(now|today)/i
    ];

    const hasKeyword = urgentKeywords.some(keyword => lowerText.includes(keyword));
    const hasPattern = timePatterns.some(pattern => pattern.test(lowerText));
    
    return (hasKeyword || hasPattern) ? 'high' : 'normal';
  }

  async handleIncomingMessage(message) {
    try {
      const msg = message.message;
      if (!msg) return;

      const from = jidNormalizedUser(message.key.remoteJid);
      
      // Ignore status updates (stories)
      if (from === 'status@broadcast') {
        return;
      }

      const messageId = message.key.id;
      const timestamp = this.normalizeTimestamp(message.messageTimestamp);
      const isGroup = from.endsWith('@g.us');

      let content = null;
      let messageType = '';

      if (msg.conversation || msg.extendedTextMessage?.text) {
        // Text message
        messageType = 'text';
        content = {
          type: 'text',
          text: msg.conversation || msg.extendedTextMessage?.text
        };
      } else if (msg.imageMessage) {
        // Image message
        messageType = 'image';
        content = {
          type: 'image',
          caption: msg.imageMessage.caption || '',
          mimetype: msg.imageMessage.mimetype
        };
      } else if (msg.videoMessage) {
        // Video message
        messageType = 'video';
        content = {
          type: 'video',
          caption: msg.videoMessage.caption || '',
          mimetype: msg.videoMessage.mimetype
        };
      } else if (msg.audioMessage) {
        // Audio message
        messageType = 'audio';
        content = {
          type: 'audio',
          mimetype: msg.audioMessage.mimetype,
          seconds: msg.audioMessage.seconds
        };
      } else if (msg.documentMessage) {
        // Document message
        messageType = 'document';
        content = {
          type: 'document',
          title: msg.documentMessage.title,
          mimetype: msg.documentMessage.mimetype,
          fileName: msg.documentMessage.fileName
        };
      } else if (msg.locationMessage) {
        // Location message
        messageType = 'location';
        content = {
          type: 'location',
          latitude: msg.locationMessage.degreesLatitude,
          longitude: msg.locationMessage.degreesLongitude,
          name: msg.locationMessage.name,
          address: msg.locationMessage.address
        };
      }

      if (content) {
        // Store the message in memory for context
        if (content.type === 'text') {
          await this.db.addMemory(
            from,  // userId
            'whatsapp_conversation',  // conversationId
            content.text,  // message
            {
              messageType: content.type,
              timestamp,
              messageId,
              isGroup,
              source: 'whatsapp'
            }
          );

          // AUTO TASK DETECTION - Process text messages for tasks
          const detectionMode = process.env.TASK_DETECTION_MODE || 'server';
          if (detectionMode !== 'server' && this.taskManager && !message.key.fromMe) {
            try {
              console.log(`📍 Auto-detecting tasks from message: "${content.text.substring(0, 50)}..."`);
              
              // Get conversation context for better task detection
              const context = await this.getConversationContext(from, 5);
              const senderName = message.pushName || 'Unknown';
              
              // Detect tasks asynchronously (don't block message processing)
              this.taskManager.detectTasks(content.text, context, senderName)
                .then(result => {
                  if (result.hasTasks && result.tasks.length > 0) {
                    console.log(`✅ Auto-detected ${result.tasks.length} task(s) from ${senderName}`);
                    // Store detected tasks in the monitoring data
                    result.tasks.forEach(task => {
                      this.db.addDetectedTask({
                        messageId,
                        senderId: from,
                        senderName,
                        task,
                        detectedAt: Date.now()
                      });
                    });
                  }
                })
                .catch(err => {
                  console.error('❌ Task auto-detection error:', err.message);
                });
            } catch (err) {
              console.error('❌ Task detection failed:', err);
            }
          }
        }

        // Add to monitoring system
        const monitoringData = {
          id: messageId,
          senderId: from,
          senderName: message.pushName || 'Unknown',  // Sender's display name
          type: messageType,
          content: content,
          timestamp: timestamp,
          isGroupMessage: isGroup,
          fromMe: message.key.fromMe || false, // Capture if message is from us
          priority: content.type === 'text' ? this.detectUrgency(content.text) : 'normal',
          groupId: isGroup ? from : null,
          groupName: isGroup ? (message.key?.remoteJid || '').replace('@g.us', '') : null,
          messageId: messageId,
          rawMessage: message
        };

        await this.db.addMonitoredMessage(monitoringData);

        if (typeof this.messageCallback === 'function') {
          try {
            this.messageCallback(monitoringData);
          } catch (callbackError) {
            console.error('Message callback error:', callbackError);
          }
        }

        // Emit MCP event for the message
        await this.emitMCPEvent({
          eventType: 'message_received',
          source: 'whatsapp_web',
          messageId,
          senderId: from,
          isGroup,
          timestamp,
          content
        });
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  updateChatCacheFromMessage(message) {
    if (!message?.key?.remoteJid) return;
    const chatId = jidNormalizedUser(message.key.remoteJid);
    const timestamp = this.normalizeTimestamp(message.messageTimestamp);
    const existing = this.chatCache.get(chatId) || { id: chatId };
    const updated = {
      ...existing,
      id: chatId,
      lastMessageTimestamp: timestamp
    };
    this.chatCache.set(chatId, updated);
    this.lastMessageByChat.set(chatId, message);
  }

  upsertChats(chats) {
    chats.forEach(chat => {
      if (!chat?.id) return;
      const chatId = jidNormalizedUser(chat.id);
      const lastMessage = chat.messages?.[0]?.message;
      const lastTimestamp = chat.lastMessageTimestamp || lastMessage?.messageTimestamp;
      const existing = this.chatCache.get(chatId) || {};
      const updated = {
        ...existing,
        ...chat,
        id: chatId,
        lastMessageTimestamp: this.normalizeTimestamp(lastTimestamp)
      };
      this.chatCache.set(chatId, updated);
      if (lastMessage?.key) {
        this.lastMessageByChat.set(chatId, lastMessage);
      }
    });
  }

  updateChats(updates) {
    updates.forEach(update => {
      if (!update?.id) return;
      const chatId = jidNormalizedUser(update.id);
      const existing = this.chatCache.get(chatId) || {};
      this.chatCache.set(chatId, { ...existing, ...update, id: chatId });
    });
  }

  async ingestHistorySync(data) {
    const chats = data?.chats || [];
    const messages = data?.messages || [];

    if (chats.length) {
      this.upsertChats(chats);
    }

    if (!messages.length) return;

    let allowlist = null;
    if (this.autoBackfillEnabled && this.autoBackfillStarted) {
      const sortedChats = chats
        .slice()
        .sort((a, b) => {
          const aTime = this.normalizeTimestamp(a.lastMessageTimestamp || a.messages?.[0]?.message?.messageTimestamp);
          const bTime = this.normalizeTimestamp(b.lastMessageTimestamp || b.messages?.[0]?.message?.messageTimestamp);
          return bTime - aTime;
        })
        .slice(0, this.autoBackfillConfig.chatLimit);
      allowlist = new Set(sortedChats.map(chat => jidNormalizedUser(chat.id)));
    }

    const perChatCounts = new Map();
    for (const msg of messages) {
      const chatId = msg?.key?.remoteJid ? jidNormalizedUser(msg.key.remoteJid) : null;
      if (!chatId) continue;

      if (allowlist && !allowlist.has(chatId)) continue;

      const count = perChatCounts.get(chatId) || 0;
      if (allowlist && count >= this.autoBackfillConfig.messagesPerChat) {
        continue;
      }
      perChatCounts.set(chatId, count + 1);

      this.updateChatCacheFromMessage(msg);
      await this.handleIncomingMessage(msg);
    }
  }

  async scheduleAutoBackfill() {
    const waitStart = Date.now();
    while (this.chatCache.size === 0 && Date.now() - waitStart < 15000) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (this.chatCache.size === 0) {
      console.warn('Auto backfill skipped: no chats available yet.');
      return;
    }
    await this.backfillRecentChats(this.autoBackfillConfig);
    this.autoBackfillEnabled = false;
  }

  async backfillRecentChats(options = {}) {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client not connected');
    }
    if (this.backfillInProgress) {
      throw new Error('Backfill already in progress');
    }

    const chatLimit = Number(options.chatLimit) || this.autoBackfillConfig.chatLimit;
    const messagesPerChat = Number(options.messagesPerChat) || this.autoBackfillConfig.messagesPerChat;
    const delayMs = Number(options.delayMs) || this.autoBackfillConfig.delayMs;

    this.backfillInProgress = true;
    const results = {
      chatLimit,
      messagesPerChat,
      delayMs,
      chatsProcessed: 0,
      chatsSkipped: 0,
      messagesRequested: 0,
      errors: []
    };

    try {
      const chats = Array.from(this.chatCache.values())
        .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0))
        .slice(0, chatLimit);

      for (const chat of chats) {
        const chatId = chat.id;
        if (!chatId) {
          results.chatsSkipped += 1;
          continue;
        }

        const existingCount = await this.db.getMessageCountForThread(chatId);
        if (existingCount >= messagesPerChat) {
          results.chatsSkipped += 1;
          continue;
        }

        const needed = messagesPerChat - existingCount;
        const lastMessage = this.lastMessageByChat.get(chatId);
        if (!lastMessage?.key) {
          results.chatsSkipped += 1;
          continue;
        }

        try {
          await this.handleIncomingMessage(lastMessage);
          const rawTimestamp = this.normalizeTimestamp(lastMessage.messageTimestamp);
          const timestampMs = rawTimestamp < 1000000000000 ? rawTimestamp * 1000 : rawTimestamp;
          await this.sock.fetchMessageHistory(needed, lastMessage.key, timestampMs);
          results.messagesRequested += needed;
          results.chatsProcessed += 1;
        } catch (error) {
          results.errors.push({ chatId, error: error.message });
        }

        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    } finally {
      this.backfillInProgress = false;
    }
    return results;
  }

  async emitMCPEvent(event) {
    // This would typically send the event to an MCP broker or queue
    console.log('Emitting MCP Event:', event);
    
    // In a real implementation, this would send to MCP system
    // For now, we'll just log the event
  }

  setQrCallback(callback) {
    this.qrCallback = callback;
  }

  getCurrentQR() {
    return this.currentQR;
  }

  async getConversationContext(userId, limit = 5) {
    try {
      const memories = await this.db.getMemories(userId, 'whatsapp_conversation', limit);
      return memories.map(m => m.message).join('\n');
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return '';
    }
  }

  async getConversationSummary(userId) {
    try {
      const memories = await this.db.getMemories(userId, 'whatsapp_conversation', 1000);
      if (memories.length === 0) {
        return {
          totalMessages: 0,
          firstMessage: null,
          lastMessage: null,
          activeDays: 0
        };
      }

      const sortedMemories = memories.sort((a, b) => a.timestamp - b.timestamp);
      const firstMessage = sortedMemories[0];
      const lastMessage = sortedMemories[sortedMemories.length - 1];

      // Calculate unique days of activity
      const uniqueDays = new Set();
      sortedMemories.forEach(memory => {
        const date = new Date(memory.timestamp).toDateString();
        uniqueDays.add(date);
      });

      return {
        totalMessages: memories.length,
        firstMessage: firstMessage.message,
        lastMessage: lastMessage.message,
        activeDays: uniqueDays.size
      };
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      return null;
    }
  }

  async getUserPreferences(userId) {
    try {
      const memories = await this.db.getMemories(userId, 'whatsapp_conversation', 100);
      
      const preferences = {
        topics: [],
        interests: [],
        commonWords: [],
        responsePatterns: []
      };

      // Extract patterns from conversation
      const allMessages = memories.map(m => m.message.toLowerCase());
      const allText = allMessages.join(' ');

      // Simple keyword extraction
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
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {};
    }
  }

  async getConversationHistory(userId, limit = 20) {
    try {
      const memories = await this.db.getMemories(userId, 'whatsapp_conversation', limit);
      return memories.map(m => ({
        id: m.id,
        userId: m.userId,
        conversationId: m.conversationId,
        message: m.message,
        timestamp: m.timestamp,
        metadata: m.metadata
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async getMonitoredMessages(limit = 50, offset = 0) {
    try {
      return await this.db.getMonitoredMessages(limit, offset);
    } catch (error) {
      console.error('Error getting monitored messages:', error);
      return [];
    }
  }

  async getUnreadMessages(limit = 50) {
    try {
      return await this.db.getUnreadMessages(limit);
    } catch (error) {
      console.error('Error getting unread messages:', error);
      return [];
    }
  }

  async markMessagesAsRead(messageIds) {
    try {
      return await this.db.markAsRead(messageIds);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return 0;
    }
  }

  async getMonitoredMessagesByType(type, limit = 50) {
    try {
      // For SQLite, we'll filter in memory since we don't have complex query methods
      const allMessages = await this.db.getMonitoredMessages(1000, 0);
      return allMessages.filter(msg => msg.type === type).slice(0, limit);
    } catch (error) {
      console.error('Error getting monitored messages by type:', error);
      return [];
    }
  }

  async getMonitoredMessagesByUser(userId, limit = 50) {
    try {
      // For SQLite, we'll filter in memory
      const allMessages = await this.db.getMonitoredMessages(1000, 0);
      return allMessages.filter(msg => msg.senderId === userId).slice(0, limit);
    } catch (error) {
      console.error('Error getting monitored messages by user:', error);
      return [];
    }
  }

  async getMonitoredMessagesByGroup(groupId, limit = 50) {
    try {
      // For SQLite, we'll filter in memory
      const allMessages = await this.db.getMonitoredMessages(1000, 0);
      return allMessages.filter(msg => msg.groupId === groupId).slice(0, limit);
    } catch (error) {
      console.error('Error getting monitored messages by group:', error);
      return [];
    }
  }

  async getMonitoringStats() {
    try {
      return await this.db.getMonitoringStats();
    } catch (error) {
      console.error('Error getting monitoring stats:', error);
      return {};
    }
  }

  async sendMessage(to, text) {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client not connected');
    }

    // Accept either a JID (e.g. 123@s.whatsapp.net / 456@g.us) or a phone number.
    const jid = this.normalizeJID(to);

    try {
      // Store the outgoing message in memory too
      await this.db.addMemory(
        to,  // userId (recipient)
        'whatsapp_conversation',  // conversationId
        text,  // message
        {
          messageType: 'text',
          timestamp: Date.now(),
          direction: 'outgoing',
          source: 'ai_agent'
        }
      );

      const response = await this.sock.sendMessage(jid, { text });
      
      // Also add to monitored messages as a sent message
      const monitoringData = {
        id: response?.key?.id || 'sent_' + Date.now(),
        senderId: 'self',
        senderName: 'You',
        type: 'text',
        content: { type: 'text', text },
        timestamp: Date.now(),
        isGroupMessage: to.endsWith('@g.us'),
        fromMe: true,
        unread: false,
        priority: 'normal',
        groupId: to.endsWith('@g.us') ? to : null,
        groupName: to.endsWith('@g.us') ? to.replace('@g.us', '') : null,
        messageId: response?.key?.id,
        rawMessage: response
      };

      await this.db.addMonitoredMessage(monitoringData);
      
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendImage(to, imageBuffer, caption = '') {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const response = await this.sock.sendMessage(
        to,
        {
          image: imageBuffer,
          caption: caption
        }
      );
      return response;
    } catch (error) {
      console.error('Error sending image:', error);
      throw error;
    }
  }

  async sendVideo(to, videoBuffer, caption = '') {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const response = await this.sock.sendMessage(
        to,
        {
          video: videoBuffer,
          caption: caption
        }
      );
      return response;
    } catch (error) {
      console.error('Error sending video:', error);
      throw error;
    }
  }

  // ==================================
  // ADVANCED TOOLS
  // ==================================

  async getConversationHistoryByThread(threadId, limit = 50) {
    try {
      return await this.db.getConversationHistory(threadId, limit);
    } catch (error) {
      console.error('Error getting conversation history by thread:', error);
      return [];
    }
  }

  async searchMessages(keyword, limit = 10) {
    try {
      const messages = await this.db.getMonitoredMessages(1000, 0);
      const results = messages
        .filter(m => {
          const content = typeof m.content === 'string' ? m.content : m.content?.text || '';
          return content.toLowerCase().includes(keyword.toLowerCase());
        })
        .slice(0, limit)
        .map(m => ({
          id: m.id,
          from: m.senderId,
          message: m.content?.text || m.content,
          timestamp: m.timestamp
        }));
      return results;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async getMessageHistory(contact, limit = 20) {
    try {
      const messages = await this.db.getMonitoredMessages(1000, 0);
      const results = messages
        .filter(m => m.senderId && m.senderId.includes(contact))
        .slice(-limit)
        .map(m => ({
          id: m.id,
          from: m.senderId,
          message: m.content?.text || m.content,
          timestamp: m.timestamp
        }));
      return results;
    } catch (error) {
      console.error('Error getting message history:', error);
      throw error;
    }
  }

  async getContactList(filter = null) {
    try {
      const chats = this.sock.store?.chats || [];
      let contacts = chats.map(chat => ({
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        unread: chat.unreadCount,
        lastMessage: chat.lastMessageTimestamp
      }));

      if (filter) {
        contacts = contacts.filter(c => 
          c.name.toLowerCase().includes(filter.toLowerCase())
        );
      }
      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  async markContactAsRead(contact, all = true) {
    try {
      if (!this.sock) throw new Error('Not connected');
      const messages = await this.db.getMonitoredMessages(1000, 0);
      const contactMessages = messages.filter(m => m.senderId && m.senderId.includes(contact));
      
      const messageIds = contactMessages.map(m => m.id).filter(Boolean);
      if (messageIds.length > 0) {
        await this.db.markAsRead(messageIds);
        await this.sock.readMessages(messageIds);
      }
      
      return { status: 'success', count: contactMessages.length };
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  async dismissThread(threadId) {
    try {
      await this.db.dismissThread(threadId);
      return { status: 'success' };
    } catch (error) {
      console.error('Error dismissing thread:', error);
      throw error;
    }
  }

  async getChatPreview(limit = 10) {
    try {
      const chats = this.sock.store?.chats || [];
      return chats.slice(0, limit).map(chat => ({
        id: chat.id,
        name: chat.name,
        lastMessage: chat.messages?.[chat.messages.length - 1]?.message || 'No messages',
        timestamp: chat.messages?.[chat.messages.length - 1]?.messageTimestamp,
        unread: chat.unreadCount
      }));
    } catch (error) {
      console.error('Error getting chat preview:', error);
      throw error;
    }
  }

  async createGroup(groupName, members) {
    try {
      if (!this.sock) throw new Error('Not connected');
      
      // Get member JIDs
      const memberJids = members.map(m => this.normalizeJID(m));
      
      // Create the group
      const response = await this.sock.groupCreate(groupName, memberJids);
      return response.gid;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  normalizeJID(input) {
    // Convert phone number or name to proper JID format
    if (input.includes('@')) return input;
    const number = input.replace(/\D/g, '');
    return `${number}@s.whatsapp.net`;
  }

  isConnected() {
    return this.isReady;
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = BaileysWhatsAppClient;
