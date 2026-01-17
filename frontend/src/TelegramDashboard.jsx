import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { MessageSquare, RefreshCw, Send, Sparkles, CheckCheck, X, History, CheckSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export default function TelegramDashboard() {
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [editingDraft, setEditingDraft] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState(new Set());
  const [selectedThreads, setSelectedThreads] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [fullHistory, setFullHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyEndRef = useRef(null);

  const playNotificationSound = () => {
    if (!audioEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Audio playback failed', error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/telegram/messages`, {
        params: { chatLimit: 100, messagesPerChat: 35, delayMs: 200 }
      });
      const allMessages = res.data.messages || [];
      const grouped = {};

      allMessages.forEach(msg => {
        const jid = msg.isGroupMessage ? msg.groupId : msg.senderId;
        if (!jid) return;
        if (!grouped[jid]) {
          grouped[jid] = {
            id: jid,
            name: msg.isGroupMessage ? (msg.groupName || jid) : (msg.senderName || jid),
            isGroup: msg.isGroupMessage,
            messages: [],
            unreadCount: 0,
            lastTimestamp: 0,
            senderId: msg.senderId
          };
        }
        grouped[jid].messages.push(msg);
        if (msg.unread && !msg.fromMe) grouped[jid].unreadCount += 1;
        if (msg.timestamp > grouped[jid].lastTimestamp) grouped[jid].lastTimestamp = msg.timestamp;
      });

      const threadList = Object.values(grouped).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      setThreads(threadList);
      setFilteredThreads(threadList);

      const maxTimestamp = threadList.reduce((max, thread) => {
        return Math.max(max, thread.lastTimestamp || 0);
      }, 0);
      if (lastProcessedTimestamp && maxTimestamp > lastProcessedTimestamp) {
        playNotificationSound();
      }
      setLastProcessedTimestamp(maxTimestamp || lastProcessedTimestamp);
    } catch (error) {
      console.error('Failed to load Telegram threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDraft = async (thread, tone = 'professional') => {
    const latestMsg = thread.messages[thread.messages.length - 1];
    try {
      setGenerating(latestMsg.id + '-' + tone);
      const res = await axios.post(`${API_URL}/telegram/process-ai`, {
        threadId: thread.id,
        message: latestMsg.content?.text || '',
        tone,
        senderName: thread.name || ''
      });
      setDrafts(prev => ({
        ...prev,
        [latestMsg.id]: res.data.draft
      }));
    } catch (error) {
      console.error('Failed to generate Telegram draft:', error);
      alert('Failed to generate draft');
    } finally {
      setGenerating(null);
    }
  };

  const sendDraft = async (to, text) => {
    if (!confirm(`Send this message?\n\n"${text}"`)) return;
    try {
      await axios.post(`${API_URL}/telegram/send`, { to, message: text });
      alert('Message sent!');
      setEditingDraft(null);
      fetchMessages();
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      alert('Failed to send message');
    }
  };

  const markThreadAsRead = async (thread) => {
    try {
      setMarkingAsRead(prev => new Set([...prev, thread.id]));
      const latestMsg = thread.messages[thread.messages.length - 1];
      await axios.post(`${API_URL}/telegram/mark-read`, {
        chatId: thread.id,
        maxMessageId: latestMsg?.id ? Number(latestMsg.id) : undefined
      });
      setThreads(prevThreads => prevThreads.filter(t => t.id !== thread.id));
      setFilteredThreads(prevFiltered => prevFiltered.filter(t => t.id !== thread.id));
    } catch (error) {
      console.error('Failed to mark Telegram thread as read:', error);
      alert('Failed to mark messages as read');
      fetchMessages();
    } finally {
      setMarkingAsRead(prev => {
        const next = new Set(prev);
        next.delete(thread.id);
        return next;
      });
    }
  };

  const toggleThreadSelection = (threadId) => {
    setSelectedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      setShowBulkActions(next.size > 0);
      return next;
    });
  };

  const markSelectedThreadsAsRead = async () => {
    if (selectedThreads.size === 0) return;
    try {
      setMarkingAsRead(new Set(selectedThreads));
      const threadsToMark = threads.filter(t => selectedThreads.has(t.id));
      const chatIds = threadsToMark.map(thread => thread.id);
      await axios.post(`${API_URL}/telegram/mark-read`, { chatIds });
      setThreads(prevThreads => prevThreads.filter(t => !selectedThreads.has(t.id)));
      setFilteredThreads(prevFiltered => prevFiltered.filter(t => !selectedThreads.has(t.id)));
      setSelectedThreads(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to mark selected Telegram threads as read:', error);
      alert('Failed to mark selected threads as read');
      fetchMessages();
    } finally {
      setMarkingAsRead(new Set());
    }
  };

  const markAllAsRead = async () => {
    try {
      if (filteredThreads.length === 0) {
        alert('No threads to mark as read');
        return;
      }
      if (!confirm(`Mark all ${filteredThreads.length} threads as read?`)) return;
      setMarkingAsRead(new Set(filteredThreads.map(t => t.id)));
      const chatIds = filteredThreads.map(thread => thread.id);
      await axios.post(`${API_URL}/telegram/mark-read`, { chatIds });
      setThreads([]);
      setFilteredThreads([]);
      setSelectedThreads(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to mark all Telegram threads as read:', error);
      alert('Failed to mark all threads as read');
      fetchMessages();
    } finally {
      setMarkingAsRead(new Set());
    }
  };

  const openHistory = async (thread) => {
    setSelectedThread(thread);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/telegram/history/${thread.id}?limit=50`);
      const history = res.data.messages.sort((a, b) => a.timestamp - b.timestamp);
      setFullHistory(history);
      setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Failed to fetch Telegram history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const generateBriefing = async () => {
    setGeneratingBriefing(true);
    setShowBriefingModal(true);
    try {
      const res = await axios.get(`${API_URL}/telegram/briefing`);
      setBriefing(res.data.summary);
    } catch (error) {
      console.error('Telegram briefing error:', error);
      setBriefing(`❌ Error generating briefing:\n\n${error.response?.data?.message || error.message}`);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredThreads(threads);
      return;
    }
    const result = threads.filter(thread => {
      const nameMatch = (thread.name || '').toLowerCase().includes(query);
      const textMatch = thread.messages.some(m => (m.content?.text || '').toLowerCase().includes(query));
      return nameMatch || textMatch;
    });
    setFilteredThreads(result);
  }, [searchQuery, threads]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <div className="max-w-[1400px] mx-auto">
        {showBulkActions && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCheck className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-medium">
                  {selectedThreads.size} thread{selectedThreads.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markSelectedThreadsAsRead}
                  disabled={markingAsRead.size > 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
                >
                  {markingAsRead.size > 0 ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  Mark as Read
                </button>
                <button
                  onClick={() => {
                    setSelectedThreads(new Set());
                    setShowBulkActions(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
            <MessageSquare className="w-8 h-8 text-sky-600" />
            Telegram AI Agent
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40 md:w-64"
            />
            <button onClick={generateBriefing} disabled={generatingBriefing} className="p-2 rounded-full hover:bg-blue-50 text-blue-600">
              {generatingBriefing ? <RefreshCw className="animate-spin w-5 h-5"/> : '📋'}
            </button>
            <button onClick={() => setAudioEnabled(!audioEnabled)} className="text-xl" title="Toggle Sound">
              {audioEnabled ? '🔔' : '🔇'}
            </button>
            {filteredThreads.length > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAsRead.size > 0}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
                title="Mark all threads as read"
              >
                {markingAsRead.size > 0 ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}
            <button onClick={fetchMessages} className="p-2 rounded-full hover:bg-gray-100">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredThreads.map(thread => {
            const latestMsg = thread.messages[thread.messages.length - 1];
            const hasDraft = drafts[latestMsg.id];
            const isEditing = editingDraft?.msgId === latestMsg.id;
            return (
              <div key={thread.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{thread.name}</div>
                    <div className="text-xs text-gray-500">{thread.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleThreadSelection(thread.id)}
                      className={`text-xs px-2 py-1 rounded-full ${selectedThreads.has(thread.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                      title="Select thread"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openHistory(thread)}
                      className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      title="View History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  {latestMsg.content?.text || '[No text]'}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => generateDraft(thread, 'professional')}
                    disabled={generating === latestMsg.id + '-professional'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {generating === latestMsg.id + '-professional' ? 'Generating...' : 'Professional'}
                  </button>
                  <button
                    onClick={() => generateDraft(thread, 'personal')}
                    disabled={generating === latestMsg.id + '-personal'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {generating === latestMsg.id + '-personal' ? 'Generating...' : 'Personal'}
                  </button>
                  <button
                    onClick={() => markThreadAsRead(thread)}
                    disabled={markingAsRead.has(thread.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark Read
                  </button>
                </div>

                {hasDraft && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-500">{hasDraft.tone} draft</div>
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => setDrafts(prev => {
                          const next = { ...prev };
                          delete next[latestMsg.id];
                          return next;
                        })}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingDraft.text}
                          onChange={(e) => setEditingDraft({ ...editingDraft, text: e.target.value })}
                          className="w-full border rounded-lg p-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendDraft(thread.id, editingDraft.text)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
                          >
                            <Send className="w-4 h-4" />
                            Send Now
                          </button>
                          <button
                            onClick={() => setEditingDraft(null)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-800 whitespace-pre-wrap">{hasDraft.text}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => sendDraft(thread.id, hasDraft.text)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
                          >
                            <Send className="w-4 h-4" />
                            Send Now
                          </button>
                          <button
                            onClick={() => setEditingDraft({ msgId: latestMsg.id, text: hasDraft.text })}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!loading && filteredThreads.length === 0 && (
            <div className="text-center text-gray-500 py-10 col-span-full">No Telegram messages found.</div>
          )}
        </div>
      </div>

      {showBriefingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-gray-900">Telegram Briefing</div>
              <button
                onClick={() => setShowBriefingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-sm whitespace-pre-wrap text-gray-800 min-h-[200px]">
              {generatingBriefing ? 'Generating briefing...' : (briefing || 'No data')}
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-gray-900">Thread History</div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto text-sm space-y-3">
              {loadingHistory && <div className="text-gray-500">Loading history...</div>}
              {!loadingHistory && fullHistory.map(msg => (
                <div key={msg.id} className={`p-3 rounded-lg ${msg.fromMe ? 'bg-blue-50' : 'bg-gray-100'}`}>
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.fromMe ? 'Me' : (msg.senderName || msg.senderId)}
                  </div>
                  <div className="text-gray-800">{msg.content?.text || '[No text]'}</div>
                </div>
              ))}
              <div ref={historyEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
