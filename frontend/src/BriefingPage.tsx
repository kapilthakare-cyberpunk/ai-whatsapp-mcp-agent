import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Sparkles, Clock, AlertTriangle, CheckCircle, MessageSquare, Check } from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function BriefingPage() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/briefing`);
      setBriefing(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch briefing:', err);
      setError('Failed to fetch briefing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'normal':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="text-red-500" size={16} />;
      case 'normal':
        return <Clock className="text-blue-500" size={16} />;
      default:
        return <MessageSquare className="text-gray-500" size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your briefing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchBriefing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="text-yellow-500" size={24} />
                  Daily Briefing
                </h1>
                {lastUpdated && (
                  <p className="text-sm text-gray-600">Last updated at {formatTime(lastUpdated)}</p>
                )}
              </div>
            </div>
            <button
              onClick={fetchBriefing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{briefing?.summary?.totalUnread || 0}</div>
              <div className="text-sm text-gray-600">Unread Messages</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{briefing?.summary?.urgentCount || 0}</div>
              <div className="text-sm text-gray-600">Urgent Messages</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{briefing?.summary?.groupChats || 0}</div>
              <div className="text-sm text-gray-600">Active Chats</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Messages to Review</h2>
          {briefing?.messages?.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">All caught up!</h3>
              <p className="text-gray-600">No unread messages at the moment.</p>
            </div>
          ) : (
            briefing?.messages?.map((msg, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                  msg.priority === 'high' ? 'border-red-500' : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(msg.priority)}
                    <div>
                      <h3 className="font-semibold text-gray-800">{msg.senderName || msg.senderId}</h3>
                      <p className="text-sm text-gray-600">{formatTimestamp(msg.timestamp)}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      msg.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {msg.priority === 'high' ? 'Urgent' : 'Normal'}
                  </span>
                </div>

                <div className={`p-4 rounded-lg border ${getPriorityColor(msg.priority)} mb-4`}>
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.content?.text || msg.content}</p>
                </div>

                {msg.suggestedResponse && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="text-yellow-500" size={16} />
                      <span className="text-sm font-medium text-gray-700">Suggested Response</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.suggestedResponse}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex justify-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2"
          >
            <MessageSquare size={20} />
            Go to Dashboard
          </button>
          <button
            onClick={fetchBriefing}
            className="bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-xl font-medium border border-gray-200 flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Refresh Briefing
          </button>
        </div>
      </div>
    </div>
  );
}
