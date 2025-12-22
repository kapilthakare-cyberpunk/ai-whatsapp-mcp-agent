// Quick test to verify Baileys functionality
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode-terminal');

async function testBaileys() {
  console.log('Testing Baileys initialization...');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./test_auth');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Test', 'Chrome', '1.0.0']
    });

    console.log('Socket created successfully');
    
    sock.ev.process(async (events) => {
      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];
        
        if (qr) {
          console.log('QR Code received:');
          QRCode.generate(qr, { small: true });
        }
      }
      
      if (events['creds.update']) {
        await saveCreds();
      }
    });
    
    console.log('Event handlers set up. Server running on background...');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testBaileys();