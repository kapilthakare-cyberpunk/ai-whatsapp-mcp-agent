const TelegramBot = require('node-telegram-bot-api');
const SQLiteDatabase = require('./sqlite-database');

class TelegramClient {
  constructor() {
    this.bot = null;
    this.isReady = false;
    this.db = new SQLiteDatabase('./telegram_data.db');
  }

  async initialize() {
    await this.db.initialize();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('TELEGRAM_BOT_TOKEN not set. Telegram client disabled.');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.isReady = true;

    this.bot.on('message', (msg) => {
      this.handleIncomingMessage(msg).catch(err => {
        console.error('Telegram message handling error:', err);
      });
    });

    console.log('Telegram bot polling started.');
  }

  normalizeTimestamp(value) {
    if (value === null || value === undefined) return Date.now();
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Date.now();
    }
    return Date.now();
  }

  async handleIncomingMessage(message) {
    if (!message || !message.chat) return;

    const chatId = String(message.chat.id);
    const senderName = message.from?.username
      ? `@${message.from.username}`
      : [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Unknown';

    const contentText = message.text || message.caption || '';
    const timestamp = this.normalizeTimestamp(message.date);

    const monitoringData = {
      id: String(message.message_id),
      senderId: chatId,
      senderName,
      type: 'text',
      content: { type: 'text', text: contentText },
      timestamp,
      isGroupMessage: message.chat.type !== 'private',
      fromMe: false,
      priority: 'normal',
      groupId: message.chat.type !== 'private' ? chatId : null,
      groupName: message.chat.title || null,
      messageId: String(message.message_id),
      rawMessage: message
    };

    await this.db.addMonitoredMessage(monitoringData);
  }

  isConnected() {
    return this.isReady;
  }

  async sendMessage(to, message) {
    if (!this.bot || !this.isReady) {
      throw new Error('Telegram client not connected');
    }
    const response = await this.bot.sendMessage(to, message);

    const monitoringData = {
      id: String(response.message_id),
      senderId: String(response.chat.id),
      senderName: 'Me',
      type: 'text',
      content: { type: 'text', text: message },
      timestamp: this.normalizeTimestamp(response.date),
      isGroupMessage: response.chat.type !== 'private',
      fromMe: true,
      priority: 'normal',
      groupId: response.chat.type !== 'private' ? String(response.chat.id) : null,
      groupName: response.chat.title || null,
      messageId: String(response.message_id),
      rawMessage: response
    };

    await this.db.addMonitoredMessage(monitoringData);
    return response;
  }

  async getUnreadMessages(limit = 50) {
    return this.db.getUnreadMessages(limit);
  }

  async markAsRead(messageIds) {
    return this.db.markAsRead(messageIds);
  }

  async getChatPreview(limit = 50) {
    const threads = await this.db.getRecentThreads(limit);
    return threads.map(thread => ({
      id: thread.thread_id,
      name: thread.sender_name || thread.thread_id,
      lastMessage: null,
      timestamp: thread.last_timestamp,
      unread: thread.unread_count
    }));
  }

  async getConversationHistory(threadId, limit = 50) {
    return this.db.getConversationHistory(threadId, limit);
  }
}

module.exports = TelegramClient;
