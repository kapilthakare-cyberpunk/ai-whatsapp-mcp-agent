import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  RefreshCw, 
  ArrowLeft, 
  Users, 
  Briefcase, 
  Heart, 
  Phone, 
  AlertTriangle,
  User,
  Clock,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function BriefingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [briefingData, setBriefingData] = useState(null);
  const [rawMessages, setRawMessages] = useState([]);

  useEffect(() => {
    generateBriefing();
  }, []);

  const generateBriefing = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, get all unread messages
      const messagesRes = await axios.get(`${API_URL}/unread?limit=200`);
      const messages = messagesRes.data.messages || [];
      setRawMessages(messages);

      if (messages.length === 0) {
        setBriefingData({
          summary: "No unread messages to analyze.",
          totalMessages: 0,
          categories: {}
        });
        setLoading(false);
        return;
      }

      // Generate AI briefing using Groq
      const briefing = await generateDetailedBriefing(messages);
      setBriefingData(briefing);
      
    } catch (err) {
      console.error('Briefing error:', err);
      setError(err.message || 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  };

  const generateDetailedBriefing = async (messages) => {
    // Categorize messages locally first
    const categories = categorizeMessages(messages);
    
    // Generate AI insights using Groq
    try {
      const aiInsights = await generateAIInsights(messages, categories);
      
      return {
        totalMessages: messages.length,
        categories,
        aiInsights,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI insights failed, using basic categorization:', error);
      
      // Fallback to basic categorization without AI
      return {
        totalMessages: messages.length,
        categories,
        aiInsights: null,
        generatedAt: new Date().toISOString()
      };
    }
  };

  const categorizeMessages = (messages) => {
    const categories = {
      business: [],
      rental: [],
      family: [],
      coldCall: [],
      spam: [],
      unknown: [],
      urgent: [],
      other: []
    };

    const keywords = {
      business: ['business', 'sale', 'offer', 'discount', 'buy', 'purchase', 'order', 'price', 'deal', 'quote', 'invoice', 'payment'],
      rental: ['rent', 'lease', 'property', 'apartment', 'house', 'car', 'vehicle', 'equipment', 'booking', 'accommodation'],
      coldCall: ['interest', 'free trial', 'limited time', 'call now', 'promotion', 'marketing', 'subscription'],
      spam: ['click here', 'free money', 'winner', 'congratulations', 'lottery', 'urgent action', 'claim now'],
      family: ['mom', 'dad', 'mother', 'father', 'son', 'daughter', 'sister', 'brother', 'family', 'love']
    };

    messages.forEach(msg => {
      const text = (msg.content?.text || '').toLowerCase();
      const senderName = (msg.senderName || '').toLowerCase();
      let categorized = false;

      // Check each category
      Object.entries(keywords).forEach(([category, keywordList]) => {
        if (keywordList.some(kw => text.includes(kw) || senderName.includes(kw))) {
          categories[category].push(msg);
          categorized = true;
        }
      });

      // Check for urgent
      if (msg.priority === 'high' || text.includes('urgent') || text.includes('asap')) {
        categories.urgent.push(msg);
        categorized = true;
      }

      // Check for unknown numbers
      const senderNumber = msg.senderId?.split('@')[0];
      if (!msg.senderName || msg.senderName === senderNumber) {
        categories.unknown.push(msg);
      }

      // Default to other if not categorized
      if (!categorized) {
        categories.other.push(msg);
      }
    });

    return categories;
  };

  const generateAIInsights = async (messages, categories) => {
    const formattedMessages = messages.slice(0, 50).map((msg, idx) => 
      `[${idx + 1}] ${msg.senderName || 'Unknown'}: ${msg.content?.text?.substring(0, 100) || ''}`
    ).join('\n');

    const prompt = `Analyze these WhatsApp messages and provide actionable insights:

MESSAGES (showing first 50):
${formattedMessages}

CATEGORIZATION:
- Business/Sales: ${categories.business.length}
- Rental Inquiries: ${categories.rental.length}
- Family/Personal: ${categories.family.length}
- Cold Calls: ${categories.coldCall.length}
- Spam: ${categories.spam.length}
- Unknown Numbers: ${categories.unknown.length}
- Urgent: ${categories.urgent.length}

Provide:
1. Top 3 priority actions
2. Key themes and patterns
3. Risk alerts (spam, urgent matters)
4. Opportunity highlights (business leads)

Be specific, actionable, and concise. Format as bullet points.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a business intelligence assistant analyzing WhatsApp messages.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY || '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'}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      business: <Briefcase className="w-5 h-5" />,
      rental: <MessageSquare className="w-5 h-5" />,
      family: <Heart className="w-5 h-5" />,
      coldCall: <Phone className="w-5 h-5" />,
      spam: <AlertTriangle className="w-5 h-5" />,
      unknown: <User className="w-5 h-5" />,
      urgent: <AlertTriangle className="w-5 h-5" />,
      other: <MessageSquare className="w-5 h-5" />
    };
    return icons[category] || icons.other;
  };

  const getCategoryColor = (category) => {
    const colors = {
      business: 'blue',
      rental: 'purple',
      family: 'pink',
      coldCall: 'orange',
      spam: 'red',
      unknown: 'gray',
      urgent: 'red',
      other: 'gray'
    };
    return colors[category] || 'gray';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      business: 'Business & Sales',
      rental: 'Rental Inquiries',
      family: 'Family & Personal',
      coldCall: 'Cold Calls',
      spam: 'Spam & Scam',
      unknown: 'Unknown Numbers',
      urgent: 'Urgent',
      other: 'Other'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Analyzing messages...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Briefing Failed</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={generateBriefing}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          
          <button
            onClick={generateBriefing}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Briefing
          </button>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Message Briefing</h1>
              <p className="text-gray-600">
                AI-powered analysis of {briefingData?.totalMessages || 0} unread messages
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            Generated at {briefingData?.generatedAt ? new Date(briefingData.generatedAt).toLocaleString() : 'N/A'}
          </div>
        </div>

        {briefingData?.totalMessages === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Unread Messages</h3>
            <p className="text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          <>
            {/* AI Insights */}
            {briefingData?.aiInsights && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg p-8 mb-6 text-white">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Briefcase size={24} />
                  AI Insights & Recommendations
                </h2>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 whitespace-pre-wrap leading-relaxed">
                  {briefingData.aiInsights}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {Object.entries(briefingData.categories || {}).map(([category, msgs]) => {
                if (msgs.length === 0) return null;
                
                const color = getCategoryColor(category);
                const icon = getCategoryIcon(category);
                
                return (
                  <div 
                    key={category}
                    className={`bg-white rounded-xl shadow-md p-6 border-l-4 border-${color}-500 hover:shadow-lg transition`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center text-${color}-600`}>
                        {icon}
                      </div>
                      <span className={`text-3xl font-bold text-${color}-600`}>
                        {msgs.length}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {getCategoryLabel(category)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {msgs.length} {msgs.length === 1 ? 'message' : 'messages'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Detailed Category Views */}
            <div className="space-y-6">
              {Object.entries(briefingData.categories || {}).map(([category, msgs]) => {
                if (msgs.length === 0) return null;
                
                const color = getCategoryColor(category);
                
                return (
                  <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className={`bg-${color}-50 border-b border-${color}-100 p-4`}>
                      <h3 className={`text-lg font-bold text-${color}-900 flex items-center gap-2`}>
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)} ({msgs.length})
                      </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {msgs.slice(0, 10).map((msg, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">
                              {msg.senderName || msg.senderId?.split('@')[0]}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(msg.timestamp * 1000).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {msg.content?.text || 'No text content'}
                          </p>
                        </div>
                      ))}
                      {msgs.length > 10 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          ... and {msgs.length - 10} more messages
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}