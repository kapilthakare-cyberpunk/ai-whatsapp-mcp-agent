const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
const BaileysWhatsAppClient = require('../utils/baileys-client');
const { generateDraft, generateBriefing } = require('../utils/draft-generator');
const TemplateStore = require('../utils/template-store');
const TaskManager = require('../utils/task-manager');
const config = require('../config/config');
const qrcode = require('qrcode-terminal');

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port;

// Initialize Baileys WhatsApp Client, Template Store, and Task Manager
const baileysClient = new BaileysWhatsAppClient();
const templateStore = new TemplateStore();
const taskManager = new TaskManager();

// Wire TaskManager into BaileysClient for auto task detection
baileysClient.setTaskManager(taskManager);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint to get QR code for WhatsApp Web authentication
app.get('/qr', async (req, res) => {
  try {
    if (!baileysClient.sock) {
      // Initialize the Baileys client if not already done
      await baileysClient.initialize();
    }

    // Check if already connected
    if (baileysClient.isConnected()) {
      return res.status(200).json({
        status: 'success',
        message: 'Already connected to WhatsApp Web',
        connected: true
      });
    }

    // Get the current QR code
    const qrCode = baileysClient.getCurrentQR();

    if (qrCode) {
      // Print QR code to terminal for direct scanning
      console.log('\nScan this QR code with your WhatsApp:');
      console.log('-----------------------------------');
      qrcode.generate(qrCode, { small: true });
      console.log('-----------------------------------');
      console.log('QR code also returned in the response for programmatic access.');

      res.status(200).json({
        status: 'success',
        qr: qrCode,
        message: 'Scan this QR code with your WhatsApp to log in. The QR code is also printed in the server console above.'
      });
    } else {
      // If no QR code is available, try to force a new connection attempt
      // by re-initializing the socket (for first-time connections)
      if (!baileysClient.sock) {
        await baileysClient.initialize();
      }
      res.status(200).json({
        status: 'waiting',
        message: 'QR code will be generated shortly. Check the server console for the QR code.',
        connected: false
      });
    }
  } catch (error) {
    console.error('Error in QR endpoint:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get connection status
app.get('/status', (req, res) => {
  res.status(200).json({
    status: baileysClient.isConnected() ? 'connected' : 'not connected',
    timestamp: new Date().toISOString()
  });
});

// Endpoint to send messages
app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "to" or "message" in request body'
      });
    }

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const result = await baileysClient.sendMessage(to, message);
    res.status(200).json({
      status: 'success',
      message: 'Message sent successfully',
      result
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get conversation context for AI processing
app.get('/context/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const context = await baileysClient.getConversationContext(userId);
    res.status(200).json({
      status: 'success',
      userId,
      context,
      message: 'Conversation context retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to process incoming messages with AI (returns drafts but doesn't send)
app.post('/process-ai', async (req, res) => {
  try {
    const { userId, message, tone } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "userId" or "message" in request body'
      });
    }

    if (!tone || !['professional', 'personal'].includes(tone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or invalid "tone" parameter. Must be "professional" or "personal"'
      });
    }

    // Get conversation context for AI processing (no connection required for draft generation)
    let context = '';
    try {
      context = await baileysClient.getConversationContext(userId);
    } catch (contextError) {
      console.log('Could not retrieve context, proceeding with message only:', contextError.message);
    }

    // Generate single AI response draft with specified tone
    const draft = await generateAIDraftWithTone(message, context, tone);

    res.status(200).json({
      status: 'success',
      message: 'Draft response generated successfully',
      draft,
      context
    });
  } catch (error) {
    console.error('Error processing AI:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get user preferences
app.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const preferences = await baileysClient.getUserPreferences(userId);
    res.status(200).json({
      status: 'success',
      userId,
      preferences,
      message: 'User preferences retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get conversation summary
app.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const summary = await baileysClient.getConversationSummary(userId);
    res.status(200).json({
      status: 'success',
      userId,
      summary,
      message: 'Conversation summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get full conversation history
app.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const history = await baileysClient.getConversationHistory(userId, limit);
    res.status(200).json({
      status: 'success',
      userId,
      history,
      count: history.length,
      message: 'Conversation history retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get monitored messages
app.get('/monitored-messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const messages = await baileysClient.getMonitoredMessages(limit, offset);
    res.status(200).json({
      status: 'success',
      messages,
      count: messages.length,
      message: 'Monitored messages retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting monitored messages:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get unread messages
app.get('/unread', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const messages = await baileysClient.getUnreadMessages(limit);
    res.status(200).json({
      status: 'success',
      messages,
      count: messages.length,
      message: 'Unread messages retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting unread messages:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to mark messages as read
app.post('/mark-read', async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || (Array.isArray(messageIds) && messageIds.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "messageIds" in request body'
      });
    }

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const count = await baileysClient.markAsRead(messageIds);
    res.status(200).json({
      status: 'success',
      count,
      message: `${count} messages marked as read`
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get monitored messages by type
app.get('/monitored-messages/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const messages = await baileysClient.getMonitoredMessagesByType(type, limit);
    res.status(200).json({
      status: 'success',
      type,
      messages,
      count: messages.length,
      message: 'Monitored messages by type retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting monitored messages by type:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get monitored messages by user
app.get('/monitored-messages/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const messages = await baileysClient.getMonitoredMessagesByUser(userId, limit);
    res.status(200).json({
      status: 'success',
      userId,
      messages,
      count: messages.length,
      message: 'Monitored messages by user retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting monitored messages by user:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get monitored messages by group
app.get('/monitored-messages/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const messages = await baileysClient.getMonitoredMessagesByGroup(groupId, limit);
    res.status(200).json({
      status: 'success',
      groupId,
      messages,
      count: messages.length,
      message: 'Monitored messages by group retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting monitored messages by group:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get monitoring statistics
app.get('/monitoring-stats', async (req, res) => {
  try {
    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    const stats = await baileysClient.getMonitoringStats();
    res.status(200).json({
      status: 'success',
      stats,
      message: 'Monitoring statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Generate single AI draft with specified tone
async function generateAIDraftWithTone(userMessage, context, tone) {
  try {
    // Use the generateDraft function from draft-generator
    const result = await generateDraft({
      userId: 'unknown', // Not needed for draft generation
      message: userMessage,
      tone: tone,
      context: context
    });
    
    if (result.success) {
      return result.draft;
    } else {
      throw new Error('Draft generation failed');
    }
  } catch (error) {
    console.error('Error generating AI draft:', error);
    // Fallback based on tone
    if (tone === 'professional') {
      return {
        text: `Thank you for your message. I'll review this and get back to you shortly.`,
        tone: 'professional',
        confidence: 0.5
      };
    } else {
      return {
        text: `Hey! Thanks for reaching out. Let me check on that and get back to you soon! 😊`,
        tone: 'personal',
        confidence: 0.5
      };
    }
  }
}

// Generate multiple AI response drafts with different toning (for backward compatibility)
async function generateAIDrafts(userMessage, context) {
  try {
    // Use the DraftResponseGenerator to create multiple options
    const drafts = await draftGenerator.generateDrafts(userMessage, context);
    return drafts;
  } catch (error) {
    console.error('Error generating AI drafts:', error);
    // Fallback to simple response if draft generation fails
    return [
      {
        id: 'draft-1',
        text: `Thanks for your message: "${userMessage}". How can I assist you today?`,
        tone: 'neutral',
        confidence: 0.7,
        suggested: true
      },
      {
        id: 'draft-2',
        text: `I see you're interested in: "${userMessage}". Based on our conversation, here's how I can help...`,
        tone: 'neutral',
        confidence: 0.65,
        suggested: true
      }
    ];
  }
}

// Endpoint to generate draft responses without sending
app.post('/drafts', async (req, res) => {
  try {
    const { message, context = '' } = req.body;

    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "message" in request body'
      });
    }

    // Generate multiple AI response drafts with different toning
    const drafts = await generateAIDrafts(message, context);

    res.status(200).json({
      status: 'success',
      message: 'Draft responses generated successfully',
      drafts
    });
  } catch (error) {
    console.error('Error generating drafts:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint to get summary of unread messages
app.get('/briefing', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    if (!baileysClient.isConnected()) {
      return res.status(500).json({
        status: 'error',
        message: 'Not connected to WhatsApp'
      });
    }

    // Get all unread messages
    const unreadMessages = await baileysClient.getUnreadMessages(limit);

    // Generate detailed briefing using AI
    const result = await generateBriefing(unreadMessages);

    res.status(200).json({
      status: 'success',
      message: 'Detailed briefing generated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error generating briefing:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Simple AI response generator (for backward compatibility)
async function generateAIResponse(userMessage, context) {
  // For backward compatibility, return just the first draft
  const drafts = await generateAIDrafts(userMessage, context);
  return drafts[0].text;
}

// ========================================
// TEMPLATE ENDPOINTS
// ========================================

// Get all templates
app.get('/templates', async (req, res) => {
  try {
    const templates = await templateStore.getAllTemplates();
    res.status(200).json({
      status: 'success',
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get templates by category
app.get('/templates/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const templates = await templateStore.getTemplatesByCategory(category);
    res.status(200).json({
      status: 'success',
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error getting templates by category:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Search templates
app.get('/templates/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ status: 'error', message: 'Missing search query' });
    }
    const templates = await templateStore.searchTemplates(q);
    res.status(200).json({
      status: 'success',
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get most used templates
app.get('/templates/most-used', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const templates = await templateStore.getMostUsed(limit);
    res.status(200).json({
      status: 'success',
      templates
    });
  } catch (error) {
    console.error('Error getting most used templates:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get recently used templates
app.get('/templates/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const templates = await templateStore.getRecentlyUsed(limit);
    res.status(200).json({
      status: 'success',
      templates
    });
  } catch (error) {
    console.error('Error getting recent templates:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get template stats
app.get('/templates/stats', async (req, res) => {
  try {
    const stats = await templateStore.getStats();
    res.status(200).json({
      status: 'success',
      stats
    });
  } catch (error) {
    console.error('Error getting template stats:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get single template
app.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await templateStore.getTemplate(id);
    if (!template) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }
    res.status(200).json({
      status: 'success',
      template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Create new template
app.post('/templates', async (req, res) => {
  try {
    const { name, text, category, shortcuts, tags } = req.body;
    
    if (!name || !text) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, text'
      });
    }

    const template = await templateStore.createTemplate({
      name,
      text,
      category,
      shortcuts: shortcuts || [],
      tags: tags || []
    });

    res.status(201).json({
      status: 'success',
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update template
app.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await templateStore.updateTemplate(id, updates);
    res.status(200).json({
      status: 'success',
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete template
app.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await templateStore.deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Use template (fill variables and track usage)
app.post('/templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const result = await templateStore.useTemplate(id, variables || {});
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (error) {
    console.error('Error using template:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get categories
app.get('/templates-categories', async (req, res) => {
  try {
    const categories = await templateStore.getCategories();
    res.status(200).json({
      status: 'success',
      categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ========================================
// TASK MANAGEMENT ENDPOINTS
// ========================================

// Detect tasks from a message
app.post('/tasks/detect', async (req, res) => {
  try {
    const { message, context, senderName } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "message" in request body'
      });
    }

    const result = await taskManager.detectTasks(message, context || '', senderName || '');
    
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (error) {
    console.error('Error detecting tasks:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add task to Todoist
app.post('/tasks/todoist/add', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing "task" in request body'
      });
    }

    const result = await taskManager.addToTodoist(task);
    
    res.status(200).json({
      status: 'success',
      message: 'Task added to Todoist',
      ...result
    });
  } catch (error) {
    console.error('Error adding task to Todoist:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Get Todoist projects
app.get('/tasks/todoist/projects', async (req, res) => {
  try {
    const projects = await taskManager.getTodoistProjects();
    res.status(200).json({
      status: 'success',
      projects
    });
  } catch (error) {
    console.error('Error getting Todoist projects:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get today's tasks from Todoist
app.get('/tasks/todoist/today', async (req, res) => {
  try {
    const tasks = await taskManager.getTodayTasks();
    res.status(200).json({
      status: 'success',
      tasks
    });
  } catch (error) {
    console.error('Error getting today\'s tasks:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Complete task in Todoist
app.post('/tasks/todoist/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await taskManager.completeTask(taskId);
    
    res.status(200).json({
      status: 'success',
      message: 'Task marked as complete'
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get auto-detected tasks
app.get('/tasks/detected', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const tasks = await baileysClient.memoryStore.getDetectedTasks(limit);
    res.status(200).json({
      status: 'success',
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error getting detected tasks:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get auto-detected tasks by sender
app.get('/tasks/detected/sender/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const tasks = await baileysClient.memoryStore.getDetectedTasksBySender(senderId, limit);
    res.status(200).json({
      status: 'success',
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error getting detected tasks by sender:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Initialize Baileys client before starting the server
async function initializeBaileys() {
  try {
    // Set up QR callback to ensure QR codes are displayed in console when generated
    // We do this BEFORE initializing to catch the very first QR code
    baileysClient.setQrCallback((qr) => {
      console.log('\nNew QR Code generated (also available at /qr endpoint):');
      console.log('Scan this QR code with your WhatsApp:');
      console.log('-----------------------------------');
      qrcode.generate(qr, { small: true });
      console.log('-----------------------------------');
    });

    await baileysClient.initialize();
    console.log('Baileys client initialized');
  } catch (error) {
    console.error('Failed to initialize Baileys client:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    connected: baileysClient.isConnected(),
    timestamp: new Date().toISOString()
  });
});

// Initialize Baileys client before starting the server
initializeBaileys().then(() => {
  // Start the server
  const server = app.listen(PORT, () => {
    console.log(`WhatsApp MCP Server is running on port ${PORT}`);
    console.log(`QR endpoint: GET http://localhost:${PORT}/qr`);
    console.log(`Status endpoint: GET http://localhost:${PORT}/status`);
    console.log(`Send message endpoint: POST http://localhost:${PORT}/send`);
    console.log(`Health check endpoint: GET http://localhost:${PORT}/health`);
  });
});

module.exports = app;