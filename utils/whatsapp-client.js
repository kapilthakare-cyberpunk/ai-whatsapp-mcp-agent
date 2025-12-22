const axios = require('axios');

/**
 * WhatsApp API Client for sending messages via the WhatsApp Business Cloud API
 */
class WhatsAppClient {
  constructor(accessToken, phoneNumberId) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send a text message to a WhatsApp user
   */
  async sendTextMessage(to, text) {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: text
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an image message to a WhatsApp user
   */
  async sendImageMessage(to, imageUrl, caption = '') {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending image message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a template message to a WhatsApp user
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending template message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a reply to an incoming message
   */
  async sendReply(to, text, contextMessageId) {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      context: {
        message_id: contextMessageId
      },
      text: {
        body: text
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending reply message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Retrieve the media URL from the WhatsApp Media ID
   */
  async getMediaUrl(mediaId) {
    const url = `${this.baseUrl}/${mediaId}`;

    try {
      const response = await axios.get(url, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error retrieving media URL:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Helper to get authorization headers for API requests
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate the webhook payload signature (for enhanced security)
   */
  validateSignature(payload, signature, secret) {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = WhatsAppClient;