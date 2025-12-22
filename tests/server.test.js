const request = require('supertest');
const app = require('../src/server');

describe('WhatsApp MCP Server', () => {
  describe('GET /webhook', () => {
    it('should verify webhook with correct token', async () => {
      const response = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'whatsapp_verify_token',
          'hub.challenge': 'challenge_string'
        });
        
      expect(response.status).toBe(200);
      expect(response.text).toBe('challenge_string');
    });

    it('should reject webhook verification with incorrect token', async () => {
      const response = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'challenge_string'
        });
        
      expect(response.status).toBe(403);
    });

    it('should reject webhook verification without mode parameter', async () => {
      const response = await request(app)
        .get('/webhook')
        .query({
          'hub.verify_token': 'whatsapp_verify_token',
          'hub.challenge': 'challenge_string'
        });
        
      expect(response.status).toBe(403);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /webhook', () => {
    it('should accept webhook payload and return 200', async () => {
      const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: 'PHONE_NUMBER_ID'
              },
              contacts: [{
                profile: {
                  name: 'Test User'
                },
                wa_id: '1234567890'
              }],
              messages: [{
                from: '1234567890',
                id: 'MESSAGE_ID',
                timestamp: '1593534820',
                text: {
                  body: 'Hello, world!'
                },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(mockPayload);

      expect(response.status).toBe(200);
    });
  });
});