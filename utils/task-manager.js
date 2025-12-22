/**
 * Task Detection and Management System
 * Detects tasks from WhatsApp messages using AI
 * Integrates with Todoist for task management
 */
const axios = require('axios');
require('dotenv').config();

class TaskManager {
  constructor() {
    this.todoistApiKey = process.env.TODOIST_API_KEY;
    this.todoistApiUrl = 'https://api.todoist.com/rest/v2';
    
    // AI APIs for task detection
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    // Task detection patterns
    this.taskKeywords = [
      'can you', 'could you', 'please', 'need to', 'have to', 'must',
      'remind me', 'don\'t forget', 'make sure', 'send me', 'call',
      'email', 'schedule', 'book', 'buy', 'get', 'prepare', 'finish',
      'complete', 'submit', 'review', 'check', 'follow up', 'reach out'
    ];
  }

  /**
   * Detect tasks from a message using AI
   */
  async detectTasks(message, context = '', senderName = '') {
    console.log(`\n🔍 Detecting tasks from message: "${message.substring(0, 50)}..."`);

    // Quick keyword check first
    const hasTaskKeywords = this.taskKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (!hasTaskKeywords) {
      console.log('❌ No task keywords found');
      return { hasTasks: false, tasks: [] };
    }

    // Use AI to extract structured tasks
    const prompt = `
Analyze this WhatsApp message and extract any tasks or action items.

SENDER: ${senderName || 'Unknown'}

CONTEXT:
${context || 'No previous context'}

MESSAGE:
"${message}"

INSTRUCTIONS:
1. Identify any tasks, action items, or things that need to be done
2. Extract the task description, deadline (if mentioned), and priority
3. Return ONLY a JSON array of tasks

OUTPUT FORMAT (JSON only, no markdown):
[
  {
    "task": "Clear, actionable task description",
    "deadline": "YYYY-MM-DD or 'today' or 'tomorrow' or 'next week' or null",
    "priority": 1-4 (1=urgent, 2=high, 3=medium, 4=low),
    "context": "Brief context if relevant",
    "category": "work" or "personal" or "shopping" or "communication"
  }
]

If no tasks found, return: []
`;

    try {
      // Try Groq first
      if (this.groqApiKey) {
        try {
          console.log('🚀 Using Groq for task detection...');
          const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'You are a task extraction expert. Extract actionable tasks from messages and return them as JSON.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.3,
              max_tokens: 500
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.groqApiKey}`
              },
              timeout: 8000
            }
          );

          const result = response.data.choices[0].message.content.trim();
          const cleanJson = result.replace(/```json|```/g, '').trim();
          const tasks = JSON.parse(cleanJson);

          console.log(`✅ Found ${tasks.length} tasks with Groq`);
          return { hasTasks: tasks.length > 0, tasks };
        } catch (groqError) {
          console.warn('⚠️  Groq failed:', groqError.message);
        }
      }

      // Fallback to keyword-based extraction
      return this.extractTasksKeywordBased(message, senderName);

    } catch (error) {
      console.error('❌ Task detection error:', error.message);
      return this.extractTasksKeywordBased(message, senderName);
    }
  }

  /**
   * Fallback: Extract tasks using keyword patterns
   */
  extractTasksKeywordBased(message, senderName = '') {
    console.log('📋 Using keyword-based task extraction...');
    
    const tasks = [];
    const lowerMessage = message.toLowerCase();

    // Pattern: "can you [task]"
    const canYouMatch = lowerMessage.match(/can you (.+?)(\.|$|\?)/i);
    if (canYouMatch) {
      tasks.push({
        task: canYouMatch[1].trim(),
        deadline: null,
        priority: 3,
        context: `Request from ${senderName}`,
        category: 'communication'
      });
    }

    // Pattern: "please [task]"
    const pleaseMatch = lowerMessage.match(/please (.+?)(\.|$|\?)/i);
    if (pleaseMatch && !canYouMatch) {
      tasks.push({
        task: pleaseMatch[1].trim(),
        deadline: null,
        priority: 3,
        context: `Request from ${senderName}`,
        category: 'communication'
      });
    }

    // Pattern: "need to [task]"
    const needToMatch = lowerMessage.match(/need to (.+?)(\.|$|\?)/i);
    if (needToMatch) {
      tasks.push({
        task: needToMatch[1].trim(),
        deadline: null,
        priority: 2,
        context: `From ${senderName}`,
        category: 'work'
      });
    }

    // Pattern: "remind me to [task]"
    const remindMatch = lowerMessage.match(/remind me to (.+?)(\.|$|\?)/i);
    if (remindMatch) {
      tasks.push({
        task: remindMatch[1].trim(),
        deadline: 'today',
        priority: 2,
        context: 'Reminder',
        category: 'personal'
      });
    }

    console.log(`✅ Found ${tasks.length} tasks with keyword extraction`);
    return { hasTasks: tasks.length > 0, tasks };
  }

  /**
   * Add task to Todoist
   */
  async addToTodoist(task) {
    if (!this.todoistApiKey) {
      throw new Error('Todoist API key not configured');
    }

    console.log(`\n📝 Adding task to Todoist: "${task.task}"`);

    try {
      const todoistTask = {
        content: task.task,
        priority: task.priority || 3,
      };

      // Add deadline if specified
      if (task.deadline) {
        if (task.deadline === 'today') {
          todoistTask.due_string = 'today';
        } else if (task.deadline === 'tomorrow') {
          todoistTask.due_string = 'tomorrow';
        } else if (task.deadline.match(/\d{4}-\d{2}-\d{2}/)) {
          todoistTask.due_date = task.deadline;
        } else {
          todoistTask.due_string = task.deadline;
        }
      }

      // Add labels/context
      if (task.context) {
        todoistTask.description = task.context;
      }

      const response = await axios.post(
        `${this.todoistApiUrl}/tasks`,
        todoistTask,
        {
          headers: {
            'Authorization': `Bearer ${this.todoistApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Task added to Todoist! ID: ${response.data.id}`);
      return {
        success: true,
        todoistTask: response.data
      };

    } catch (error) {
      console.error('❌ Todoist API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to add task to Todoist');
    }
  }

  /**
   * Get Todoist projects (for organization)
   */
  async getTodoistProjects() {
    if (!this.todoistApiKey) {
      throw new Error('Todoist API key not configured');
    }

    try {
      const response = await axios.get(
        `${this.todoistApiUrl}/projects`,
        {
          headers: {
            'Authorization': `Bearer ${this.todoistApiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching Todoist projects:', error);
      return [];
    }
  }

  /**
   * Get today's tasks from Todoist
   */
  async getTodayTasks() {
    if (!this.todoistApiKey) {
      throw new Error('Todoist API key not configured');
    }

    try {
      const response = await axios.get(
        `${this.todoistApiUrl}/tasks?filter=today`,
        {
          headers: {
            'Authorization': `Bearer ${this.todoistApiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
      return [];
    }
  }

  /**
   * Complete a task in Todoist
   */
  async completeTask(taskId) {
    if (!this.todoistApiKey) {
      throw new Error('Todoist API key not configured');
    }

    try {
      await axios.post(
        `${this.todoistApiUrl}/tasks/${taskId}/close`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.todoistApiKey}`
          }
        }
      );

      console.log(`✅ Task ${taskId} marked as complete in Todoist`);
      return { success: true };
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Analyze message for task urgency
   */
  detectUrgency(message) {
    const urgentKeywords = [
      'urgent', 'asap', 'immediately', 'right now', 'emergency',
      'critical', 'important', 'priority', 'deadline', 'today'
    ];

    const lowerMessage = message.toLowerCase();
    const hasUrgentKeyword = urgentKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    return hasUrgentKeyword ? 1 : 3; // 1 = urgent, 3 = normal
  }
}

module.exports = TaskManager;