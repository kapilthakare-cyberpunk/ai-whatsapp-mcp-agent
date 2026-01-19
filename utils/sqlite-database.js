/**
 * SQLite-based persistent database for WhatsApp conversations
 * Provides enhanced performance and reliability over JSON file storage
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SQLiteDatabase {
  constructor(dbPath = './whatsapp_data.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.isInitialized = false;
  }

  normalizeTimestamp(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === 'object') {
      if (typeof value.toNumber === 'function') return value.toNumber();
      if (typeof value.toString === 'function') {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : null;
      }
    }
    return null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.db.run('PRAGMA journal_mode = WAL');
          this.db.run('PRAGMA busy_timeout = 5000');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      // Messages table for storing all WhatsApp messages
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        message_id TEXT UNIQUE,
        sender_id TEXT NOT NULL,
        sender_name TEXT,
        content TEXT,
        content_type TEXT DEFAULT 'text',
        timestamp INTEGER NOT NULL,
        is_group_message BOOLEAN DEFAULT 0,
        from_me BOOLEAN DEFAULT 0,
        unread BOOLEAN DEFAULT 1,
        priority TEXT DEFAULT 'normal',
        group_id TEXT,
        group_name TEXT,
        raw_message TEXT,
        monitored_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )`,

      // Conversations table for storing conversation metadata
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        last_message_id TEXT,
        last_message_timestamp INTEGER,
        unread_count INTEGER DEFAULT 0,
        has_urgent BOOLEAN DEFAULT 0,
        has_sent_messages BOOLEAN DEFAULT 0,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, conversation_id)
      )`,

      // Memories table for storing conversation context and memories
      `CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        message TEXT NOT NULL,
        memory_type TEXT DEFAULT 'conversation',
        metadata TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )`,

      // Detected tasks table for auto-detected tasks
      `CREATE TABLE IF NOT EXISTS detected_tasks (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT,
        task_description TEXT NOT NULL,
        task_priority TEXT DEFAULT 'normal',
        detected_at INTEGER NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )`,

      // Dismissed threads table for tracking hidden threads
      `CREATE TABLE IF NOT EXISTS dismissed_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT UNIQUE NOT NULL,
        dismissed_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )`,

      // Indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(unread)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_from_me ON messages(from_me)`,
      `CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_detected_tasks_sender ON detected_tasks(sender_id)`,
      `CREATE INDEX IF NOT EXISTS idx_detected_tasks_detected ON detected_tasks(detected_at DESC)`
    ];

    for (const query of queries) {
      await this.runQuery(query);
    }

    this.isInitialized = true;
    console.log('✅ Database tables created successfully');
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async addMonitoredMessage(messageData) {
    const messageId = messageData.id || uuidv4();
    const normalizedTimestamp = this.normalizeTimestamp(messageData.timestamp);
    
    const query = `
      INSERT OR REPLACE INTO messages (
        id, message_id, sender_id, sender_name, content, content_type, 
        timestamp, is_group_message, from_me, unread, priority, 
        group_id, group_name, raw_message, monitored_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(query, [
      messageId,
      messageData.messageId || messageId,
      messageData.senderId,
      messageData.senderName || null,
      messageData.content?.text || JSON.stringify(messageData.content),
      messageData.type || 'text',
      normalizedTimestamp ?? Date.now(),
      messageData.isGroupMessage ? 1 : 0,
      messageData.fromMe ? 1 : 0,
      messageData.unread !== undefined ? (messageData.unread ? 1 : 0) : 1,
      messageData.priority || 'normal',
      messageData.groupId || null,
      messageData.groupName || null,
      JSON.stringify(messageData.rawMessage || {}),
      Date.now()
    ]);

    // Update conversation metadata
    await this.updateConversationMetadata(messageData);

    return messageId;
  }

  async updateConversationMetadata(messageData) {
    const threadId = messageData.isGroupMessage ? messageData.groupId : messageData.senderId;
    const conversationId = `whatsapp_conversation`;
    
    // Check if conversation exists
    const existing = await this.getQuery(
      'SELECT * FROM conversations WHERE user_id = ? AND conversation_id = ?',
      [threadId, conversationId]
    );

    if (existing) {
      // Update existing conversation
      const updateQuery = `
        UPDATE conversations 
        SET last_message_id = ?, last_message_timestamp = ?, 
            unread_count = ?, has_urgent = ?, has_sent_messages = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND conversation_id = ?
      `;

      // Calculate unread count for this thread
      const unreadCount = await this.getQuery(
        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND unread = 1 AND from_me = 0',
        [threadId]
      );

      // Check if has urgent messages
      const hasUrgent = await this.getQuery(
        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND priority = "high" AND from_me = 0',
        [threadId]
      );

      // Check if has sent messages
      const hasSent = await this.getQuery(
        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND from_me = 1',
        [threadId]
      );

      await this.runQuery(updateQuery, [
        messageData.id || messageData.messageId,
        messageData.timestamp,
        unreadCount.count,
        hasUrgent.count > 0 ? 1 : 0,
        hasSent.count > 0 ? 1 : 0,
        threadId,
        conversationId
      ]);
    } else {
      // Create new conversation
      const insertQuery = `
        INSERT INTO conversations (
          user_id, conversation_id, last_message_id, last_message_timestamp,
          unread_count, has_urgent, has_sent_messages
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.runQuery(insertQuery, [
        threadId,
        conversationId,
        messageData.id || messageData.messageId,
        messageData.timestamp,
        messageData.fromMe ? 0 : 1,
        messageData.priority === 'high' ? 1 : 0,
        messageData.fromMe ? 1 : 0
      ]);
    }
  }

  async getUnreadMessages(limit = 50) {
    const query = `
      SELECT * FROM messages 
      WHERE unread = 1 AND from_me = 0
      AND sender_id NOT IN (SELECT thread_id FROM dismissed_threads)
      ORDER BY timestamp DESC 
      LIMIT ?
    `;

    const rows = await this.allQuery(query, [limit]);
    return rows.map(row => this.dbRowToMessage(row));
  }

  async getMonitoredMessages(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM messages 
      WHERE sender_id NOT IN (SELECT thread_id FROM dismissed_threads)
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    const rows = await this.allQuery(query, [limit, offset]);
    return rows.map(row => this.dbRowToMessage(row));
  }

  async markAsRead(messageIds) {
    const idsArray = Array.isArray(messageIds) ? messageIds : [messageIds];
    const placeholders = idsArray.map(() => '?').join(',');
    
    const query = `
      UPDATE messages 
      SET unread = 0 
      WHERE id IN (${placeholders}) OR message_id IN (${placeholders})
    `;

    const result = await this.runQuery(query, [...idsArray, ...idsArray]);
    
    // Update conversation metadata after marking as read
    const threadsToUpdate = new Set();
    for (const id of idsArray) {
      const message = await this.getQuery('SELECT sender_id FROM messages WHERE id = ? OR message_id = ?', [id, id]);
      if (message) {
        threadsToUpdate.add(message.sender_id);
      }
    }

    // Update each affected thread
    for (const threadId of threadsToUpdate) {
      const unreadCount = await this.getQuery(
        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND unread = 1 AND from_me = 0',
        [threadId]
      );

      if (unreadCount.count === 0) {
        // Mark thread as dismissed if no unread messages
        await this.dismissThread(threadId);
      } else {
        // Update conversation metadata
        const lastMessage = await this.getQuery(
          'SELECT * FROM messages WHERE sender_id = ? ORDER BY timestamp DESC LIMIT 1',
          [threadId]
        );

        if (lastMessage) {
          await this.updateConversationMetadata(this.dbRowToMessage(lastMessage));
        }
      }
    }

    return result.changes;
  }

  async dismissThread(threadId) {
    await this.runQuery(
      'INSERT OR IGNORE INTO dismissed_threads (thread_id) VALUES (?)',
      [threadId]
    );
  }

  async undismissThread(threadId) {
    await this.runQuery(
      'DELETE FROM dismissed_threads WHERE thread_id = ?',
      [threadId]
    );
  }

  async getDismissedThreads() {
    const rows = await this.allQuery('SELECT thread_id FROM dismissed_threads');
    return rows.map(row => row.thread_id);
  }

  async getConversationHistory(threadId, limit = 50) {
    const query = `
      SELECT * FROM messages 
      WHERE sender_id = ? OR group_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `;

    const rows = await this.allQuery(query, [threadId, threadId, limit]);
    return rows.map(row => this.dbRowToMessage(row));
  }

  async addMemory(userId, conversationId, message, metadata = {}) {
    const memoryId = uuidv4();
    
    const query = `
      INSERT INTO memories (id, user_id, conversation_id, message, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(query, [
      memoryId,
      userId,
      conversationId,
      message,
      JSON.stringify(metadata),
      Date.now()
    ]);

    return memoryId;
  }

  async getMemories(userId, conversationId, limit = 10) {
    const query = `
      SELECT * FROM memories 
      WHERE user_id = ? AND conversation_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `;

    const rows = await this.allQuery(query, [userId, conversationId, limit]);
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      message: row.message,
      timestamp: row.timestamp,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async addDetectedTask(taskData) {
    const taskId = uuidv4();
    
    const query = `
      INSERT INTO detected_tasks (
        id, message_id, sender_id, sender_name, task_description, 
        task_priority, detected_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(query, [
      taskId,
      taskData.messageId,
      taskData.senderId,
      taskData.senderName || null,
      taskData.task.task || JSON.stringify(taskData.task),
      taskData.task.priority || 'normal',
      taskData.detectedAt || Date.now(),
      JSON.stringify(taskData.task.metadata || {})
    ]);

    return taskId;
  }

  async getDetectedTasks(limit = 50) {
    const query = `
      SELECT * FROM detected_tasks 
      ORDER BY detected_at DESC 
      LIMIT ?
    `;

    const rows = await this.allQuery(query, [limit]);
    return rows.map(row => ({
      id: row.id,
      messageId: row.message_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      task: {
        task: row.task_description,
        priority: row.task_priority,
        metadata: JSON.parse(row.metadata || '{}')
      },
      detectedAt: row.detected_at
    }));
  }

  async getMonitoringStats() {
    const totalMessages = await this.getQuery('SELECT COUNT(*) as count FROM messages');
    const groupMessages = await this.getQuery('SELECT COUNT(*) as count FROM messages WHERE is_group_message = 1');
    const individualMessages = await this.getQuery('SELECT COUNT(*) as count FROM messages WHERE is_group_message = 0');
    const unreadMessages = await this.getQuery('SELECT COUNT(*) as count FROM messages WHERE unread = 1 AND from_me = 0');
    
    return {
      totalMessages: totalMessages.count,
      groupMessages: groupMessages.count,
      individualMessages: individualMessages.count,
      unreadMessages: unreadMessages.count,
      lastMonitored: new Date().toISOString()
    };
  }

  async getUnreadCountsByThread(limit = 50) {
    if (!this.db) return [];
    const query = `
      SELECT sender_id as threadId,
             COUNT(*) as unreadCount,
             MAX(timestamp) as lastTimestamp
      FROM messages
      WHERE unread = 1 AND from_me = 0
        AND sender_id NOT IN (SELECT thread_id FROM dismissed_threads)
      GROUP BY sender_id
      ORDER BY unreadCount DESC, lastTimestamp DESC
      LIMIT ?
    `;
    return await this.allQuery(query, [limit]);
  }

  async getTotalMessagesCount() {
    const row = await this.getQuery('SELECT COUNT(*) as count FROM messages');
    return row?.count || 0;
  }

  async getMessageCountForThread(threadId) {
    const row = await this.getQuery(
      'SELECT COUNT(*) as count FROM messages WHERE sender_id = ?',
      [threadId]
    );
    return row?.count || 0;
  }

  async getRecentThreads(limit = 50) {
    const query = `
      SELECT 
        sender_id as thread_id,
        MAX(timestamp) as last_timestamp,
        MAX(sender_name) as sender_name,
        SUM(CASE WHEN unread = 1 AND from_me = 0 THEN 1 ELSE 0 END) as unread_count
      FROM messages
      GROUP BY sender_id
      ORDER BY last_timestamp DESC
      LIMIT ?
    `;
    return this.allQuery(query, [limit]);
  }

  // Helper method to convert database row to message object
  dbRowToMessage(row) {
    const rawMessage = JSON.parse(row.raw_message || '{}');
    let timestamp = this.normalizeTimestamp(row.timestamp);
    if (!timestamp) {
      const rawTimestamp = rawMessage.messageTimestamp || rawMessage?.message?.messageTimestamp;
      timestamp = this.normalizeTimestamp(rawTimestamp) || row.timestamp;
    }
    return {
      id: row.id,
      messageId: row.message_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      type: row.content_type,
      content: this.parseContent(row.content, row.content_type),
      timestamp,
      isGroupMessage: !!row.is_group_message,
      fromMe: !!row.from_me,
      unread: !!row.unread,
      priority: row.priority,
      groupId: row.group_id,
      groupName: row.group_name,
      rawMessage
    };
  }

  parseContent(content, contentType) {
    if (contentType === 'text') {
      return { type: 'text', text: content };
    }
    
    try {
      return JSON.parse(content);
    } catch {
      return { type: contentType, text: content };
    }
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = SQLiteDatabase;
