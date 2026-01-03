const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config/config');










const MemoryStore = require('./memory-store');

class BaileysWhatsAppClient {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.qrCallback = null;
    this.currentQR = null;
    this.authState = null;
    this.memoryStore = new MemoryStore();
    this.taskManager = null; // Will be injected from server
  }

  // Method to inject TaskManager from server.js
  setTaskManager(taskManager) {
    this.taskManager = taskManager;
  }

  async initialize() {
    try {
      // Initialize auth state separately
      const { state, saveCreds } = await useMultiFileAuthState('./baileys_store_multi');
      this.authState = { state, saveCreds };

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR codes ourselves
        browser: ['Qwen MCP Server', 'Safari', '1.0.0'],
      });

      this.setupConnectionHandlers();
      return this.sock;
    } catch (error) {
      console.error('Error initializing Baileys client:', error);
      throw error;
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
          await this.handleIncomingMessage(msg);
        }
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
      const timestamp = message.messageTimestamp;
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
          await this.memoryStore.addMemory(
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
          if (this.taskManager && !message.key.fromMe) {
            try {
              console.log(`🔍 Auto-detecting tasks from message: "${content.text.substring(0, 50)}..."`);
              
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
                      this.memoryStore.addDetectedTask({
                        messageId,
                        senderId: from,
                        senderName,
                        task,
                        timestamp: Date.now()
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

        await this.memoryStore.addMonitoredMessage(monitoringData);

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
      const context = await this.memoryStore.getConversationContext(userId, 'whatsapp_conversation', limit);
      return context;
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return '';
    }
  }

  async getConversationSummary(userId) {
    try {
      return await this.memoryStore.getConversationSummary(userId);
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      return null;
    }
  }

  async getUserPreferences(userId) {
    try {
      return await this.memoryStore.getUserPreferences(userId);
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {};
    }
  }

  async getConversationHistory(userId, limit = 20) {
    try {
      return await this.memoryStore.getConversationHistory(userId, limit);
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async getMonitoredMessages(limit = 50, offset = 0) {
    try {
      return await this.memoryStore.getMonitoredMessages(limit, offset);
    } catch (error) {
      console.error('Error getting monitored messages:', error);
      return [];
    }
  }

  async getUnreadMessages(limit = 50) {
    try {
      return await this.memoryStore.getUnreadMessages(limit);
    } catch (error) {
      console.error('Error getting unread messages:', error);
      return [];
    }
  }

  async markAsRead(messageIds) {
    try {
      return await this.memoryStore.markAsRead(messageIds);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return 0;
    }
  }

  async getMonitoredMessagesByType(type, limit = 50) {
    try {
      return await this.memoryStore.getMonitoredMessagesByType(type, limit);
    } catch (error) {
      console.error('Error getting monitored messages by type:', error);
      return [];
    }
  }

  async getMonitoredMessagesByUser(userId, limit = 50) {
    try {
      return await this.memoryStore.getMonitoredMessagesByUser(userId, limit);
    } catch (error) {
      console.error('Error getting monitored messages by user:', error);
      return [];
    }
  }

  async getMonitoredMessagesByGroup(groupId, limit = 50) {
    try {
      return await this.memoryStore.getMonitoredMessagesByGroup(groupId, limit);
    } catch (error) {
      console.error('Error getting monitored messages by group:', error);
      return [];
    }
  }

  async getMonitoringStats() {
    try {
      return await this.memoryStore.getMonitoringStats();
    } catch (error) {
      console.error('Error getting monitoring stats:', error);
      return {};
    }
  }

  async sendMessage(to, text) {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      // Store the outgoing message in memory too
      await this.memoryStore.addMemory(
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

      const response = await this.sock.sendMessage(to, { text });
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

  // ============================================
  // ADVANCED TOOLS
  // ============================================

  async searchMessages(keyword, limit = 10) {
    try {
      const messages = this.memoryStore.getAllMessages();
      const results = messages
        .filter(m => m.message && m.message.toLowerCase().includes(keyword.toLowerCase()))
        .slice(0, limit)
        .map(m => ({
          id: m.id,
          from: m.from,
          message: m.message,
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
      const messages = this.memoryStore.getAllMessages()
        .filter(m => m.from && m.from.includes(contact))
        .slice(-limit)
        .map(m => ({
          id: m.id,
          from: m.from,
          message: m.message,
          timestamp: m.timestamp
        }));
      return messages;
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

  async markAsRead(contact, all = true) {
    try {
      if (!this.sock) throw new Error('Not connected');
      const messages = this.memoryStore.getAllMessages()
        .filter(m => m.from && m.from.includes(contact));
      
      for (const msg of messages) {
        if (msg.id) {
          await this.sock.readMessages([msg.id]);
        }
      }
      return { status: 'success', count: messages.length };
    } catch (error) {
      console.error('Error marking as read:', error);
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
}

module.exports = BaileysWhatsAppClient;
