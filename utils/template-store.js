/**
 * Template Storage System
 * Stores message templates with variables, categories, and usage statistics
 */
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TemplateStore {
  constructor(filePath = './whatsapp_templates.json') {
    this.filePath = filePath;
    this.templates = new Map();
    this.categories = new Set(['business', 'personal', 'inquiry', 'follow-up', 'greeting', 'closing']);
    this.init();
  }

  async init() {
    await this.ensureFileExists();
    await this.loadTemplates();
  }

  async ensureFileExists() {
    try {
      await fs.access(this.filePath);
    } catch (error) {
      // File doesn't exist, create with default templates
      const defaultTemplates = this.getDefaultTemplates();
      await this.saveTemplates(defaultTemplates);
    }
  }

  getDefaultTemplates() {
    return [
      {
        id: uuidv4(),
        name: 'Property Inquiry Response',
        category: 'business',
        text: 'Hi {{name}}, thanks for asking about {{property}}. Yes, it\'s available! Would you like to schedule a viewing? I\'m available {{availability}}.',
        variables: ['name', 'property', 'availability'],
        shortcuts: ['prop', 'property'],
        tags: ['real-estate', 'inquiry', 'first-contact'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: uuidv4(),
        name: 'Pricing Information',
        category: 'business',
        text: 'The price for {{item}} is {{price}}. This includes {{inclusions}}. Would you like to proceed?',
        variables: ['item', 'price', 'inclusions'],
        shortcuts: ['price', 'pricing'],
        tags: ['pricing', 'business'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: uuidv4(),
        name: 'Meeting Confirmation',
        category: 'business',
        text: 'Perfect! I\'ve scheduled our meeting for {{date}} at {{time}}. Looking forward to it! {{location}}',
        variables: ['date', 'time', 'location'],
        shortcuts: ['meeting', 'confirm'],
        tags: ['meeting', 'confirmation'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: uuidv4(),
        name: 'Follow-up Reminder',
        category: 'follow-up',
        text: 'Hi {{name}}, just following up on {{topic}}. Have you had a chance to think about it?',
        variables: ['name', 'topic'],
        shortcuts: ['followup', 'reminder'],
        tags: ['follow-up', 'reminder'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: uuidv4(),
        name: 'Thank You',
        category: 'closing',
        text: 'Thank you so much, {{name}}! I really appreciate {{reason}}. Have a great day! 😊',
        variables: ['name', 'reason'],
        shortcuts: ['thanks', 'thankyou'],
        tags: ['gratitude', 'closing'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: uuidv4(),
        name: 'Out of Office',
        category: 'personal',
        text: 'Thanks for your message! I\'m currently away and will respond by {{return_date}}. For urgent matters, please contact {{backup_contact}}.',
        variables: ['return_date', 'backup_contact'],
        shortcuts: ['ooo', 'away'],
        tags: ['auto-reply', 'vacation'],
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }

  async loadTemplates() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const templatesArray = JSON.parse(data);
      this.templates = new Map(templatesArray.map(t => [t.id, t]));
      console.log(`✅ Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.error('Error loading templates:', error);
      this.templates = new Map();
    }
  }

  async saveTemplates(templatesArray = null) {
    try {
      const data = templatesArray || Array.from(this.templates.values());
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Saved ${data.length} templates`);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  // Get all templates
  async getAllTemplates() {
    return Array.from(this.templates.values());
  }

  // Get templates by category
  async getTemplatesByCategory(category) {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  // Get template by ID
  async getTemplate(id) {
    return this.templates.get(id);
  }

  // Search templates
  async searchTemplates(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.text.toLowerCase().includes(lowerQuery) ||
      t.shortcuts.some(s => s.toLowerCase().includes(lowerQuery)) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Create new template
  async createTemplate(templateData) {
    const template = {
      id: uuidv4(),
      name: templateData.name,
      category: templateData.category || 'personal',
      text: templateData.text,
      variables: this.extractVariables(templateData.text),
      shortcuts: templateData.shortcuts || [],
      tags: templateData.tags || [],
      usageCount: 0,
      lastUsed: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.templates.set(template.id, template);
    await this.saveTemplates();
    return template;
  }

  // Update template
  async updateTemplate(id, updates) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      id, // Preserve ID
      variables: updates.text ? this.extractVariables(updates.text) : template.variables,
      updatedAt: Date.now()
    };

    this.templates.set(id, updatedTemplate);
    await this.saveTemplates();
    return updatedTemplate;
  }

  // Delete template
  async deleteTemplate(id) {
    const deleted = this.templates.delete(id);
    if (deleted) {
      await this.saveTemplates();
    }
    return deleted;
  }

  // Use template (track usage)
  async useTemplate(id, variables = {}) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Update usage stats
    template.usageCount++;
    template.lastUsed = Date.now();
    this.templates.set(id, template);
    await this.saveTemplates();

    // Fill in variables
    let text = template.text;
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return {
      text,
      template: template,
      missingVariables: template.variables.filter(v => !variables[v])
    };
  }

  // Extract variables from template text
  extractVariables(text) {
    const regex = /{{(\w+)}}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }

  // Get most used templates
  async getMostUsed(limit = 5) {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  // Get recently used templates
  async getRecentlyUsed(limit = 5) {
    return Array.from(this.templates.values())
      .filter(t => t.lastUsed)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  // Get categories
  async getCategories() {
    return Array.from(this.categories);
  }

  // Get template statistics
  async getStats() {
    const templates = Array.from(this.templates.values());
    return {
      total: templates.length,
      byCategory: templates.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {}),
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      mostUsed: await this.getMostUsed(3),
      recentlyUsed: await this.getRecentlyUsed(3)
    };
  }
}

module.exports = TemplateStore;