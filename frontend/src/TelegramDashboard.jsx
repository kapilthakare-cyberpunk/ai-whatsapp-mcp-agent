import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, Send } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export default function TelegramDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/telegram/unread`, { params: { limit: 100 } });
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error('Failed to load Telegram messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.post(`${API_URL}/telegram/mark-read`, { messageIds: [messageId] });
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Failed to mark Telegram message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!sendTo || !sendText) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/telegram/send`, { to: sendTo, message: sendText });
      setSendText('');
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Telegram Inbox</h1>
        <button onClick={fetchMessages} className="p-2 rounded-full hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Send Message</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            placeholder="Chat ID"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Message"
            value={sendText}
            onChange={(e) => setSendText(e.target.value)}
            className="flex-[2] px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-900">{msg.senderName || msg.senderId}</div>
                <div className="text-sm text-gray-500">{msg.senderId}</div>
              </div>
              <button
                onClick={() => markAsRead(msg.id)}
                className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                Mark Read
              </button>
            </div>
            <div className="mt-3 text-gray-800">{msg.content?.text || '[No text]'}</div>
          </div>
        ))}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 py-10">No unread Telegram messages.</div>
        )}
      </div>
    </div>
  );
}
