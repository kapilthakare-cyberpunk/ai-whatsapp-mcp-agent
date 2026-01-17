import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, RefreshCw, Send, Sparkles, Check, User, Users, Pencil, X, AlertTriangle, ChevronDown, ChevronUp, History, FileText, CheckSquare, CheckCheck, Eye, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export default function Dashboard() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]); // Grouped messages: { [jid]: { ...metadata, messages: [] } }
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null); // ID of message/thread being processed
  const [drafts, setDrafts] = useState({}); // Map of messageId -> drafts
  const [editingDraft, setEditingDraft] = useState(null); // { msgId, text } or null
  const [lastProcessedId, setLastProcessedId] = useState(null); // Track last message for notifications
  const [audioEnabled, setAudioEnabled] = useState(true); // Toggle for audio notifications
  const [briefing, setBriefing] = useState(null); // Store the briefing summary
  const [showBriefingModal, setShowBriefingModal] = useState(false); // Toggle briefing modal
  const [generatingBriefing, setGeneratingBriefing] = useState(false); // Loading state for briefing
  const [searchQuery, setSearchQuery] = useState(''); // Search query
  const [filteredThreads, setFilteredThreads] = useState([]); // Filtered threads
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'work', 'personal', etc.
  const [selectedThreads, setSelectedThreads] = useState(new Set()); // For bulk actions
  const [showBulkActions, setShowBulkActions] = useState(false); // Toggle bulk actions toolbar
  const [markingAsRead, setMarkingAsRead] = useState(new Set()); // Track threads being marked as read
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Full History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null); // The thread object being viewed
  const [fullHistory, setFullHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyEndRef = useRef(null);

  // Notification sound function (same as before)
  const playNotificationSound = (isUrgent = false) => {
    if (!audioEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (isUrgent) {
        // Double beep for urgent
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 1200;
        gainNode1.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
        oscillator1.start();
        oscillator1.stop(audioContext.currentTime + 0.15);

        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 1200;
        const secondBeepStart = audioContext.currentTime + 0.3;
        gainNode2.gain.setValueAtTime(0.15, secondBeepStart);
        gainNode2.gain.exponentialRampToValueAtTime(0.00001, secondBeepStart + 0.15);
        oscillator2.start(secondBeepStart);
        oscillator2.stop(secondBeepStart + 0.15);
      } else {
        // Single beep
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
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/monitored-messages?limit=100`); // Fetch more to build better threads
      let allMessages = res.data.messages.filter(m => m.type === 'text'); // Include both sent and received messages

      // Grouping Logic
      const grouped = {};
      let maxTimestamp = 0;
      let newMaxId = lastProcessedId;

      allMessages.forEach(msg => {
        const jid = msg.isGroupMessage ? msg.groupId : msg.senderId;
        
        if (!grouped[jid]) {
          grouped[jid] = {
            id: jid,
            name: msg.isGroupMessage ? msg.groupName : (msg.senderName || jid.split('@')[0]),
            isGroup: msg.isGroupMessage,
            messages: [],
            unreadCount: 0,
            hasUrgent: false,
            lastTimestamp: 0,
            senderId: msg.senderId, // Keep reference for drafting
            hasSentMessages: false // Track if thread has sent messages
          };
        }

        grouped[jid].messages.push(msg);
        if (msg.unread && !msg.fromMe) grouped[jid].unreadCount++; // Only count incoming messages as unread
        if (msg.priority === 'high' && !msg.fromMe) grouped[jid].hasUrgent = true; // Only mark incoming as urgent
        if (msg.fromMe) grouped[jid].hasSentMessages = true; // Track sent messages
        if (msg.timestamp > grouped[jid].lastTimestamp) grouped[jid].lastTimestamp = msg.timestamp;
        
        if (msg.timestamp > maxTimestamp) maxTimestamp = msg.timestamp;
        
        // Track new messages for sound (naive check by ID if we have processed it before)
        // Ideally we check if this ID > lastProcessedId
      });

      // Convert to array
      const threadArray = Object.values(grouped);

      // Sort messages within threads
      threadArray.forEach(t => {
        t.messages.sort((a, b) => a.timestamp - b.timestamp);
      });

      // Sort threads: Urgent first, then Recent
      threadArray.sort((a, b) => {
        if (a.hasUrgent && !b.hasUrgent) return -1;
        if (!a.hasUrgent && b.hasUrgent) return 1;
        return b.lastTimestamp - a.lastTimestamp;
      });

      // Sound Logic - only for incoming messages
      const incomingOnly = allMessages.filter(m => !m.fromMe);
      if (incomingOnly.length > 0) {
        const latestMsg = incomingOnly.reduce((prev, current) => (prev.timestamp > current.timestamp) ? prev : current);
        
        if (lastProcessedId && latestMsg.id !== lastProcessedId) {
           playNotificationSound(latestMsg.priority === 'high');
        }
        setLastProcessedId(latestMsg.id);
      }

      setThreads(threadArray);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Log out and clear the current WhatsApp session?')) return;
    try {
      setLoggingOut(true);
      await axios.post(`${API_URL}/logout`);
      setThreads([]);
      setFilteredThreads([]);
      alert('Logged out. Re-scan the QR code to connect again.');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000); 
    return () => clearInterval(interval);
  }, []);

  // Filtering Logic
  useEffect(() => {
    let result = threads;

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.messages.some(m => m.content?.text?.toLowerCase().includes(q))
      );
    }

    // Tab Filter
    if (activeTab === 'work') {
      result = result.filter(t => {
        // Primes & Zooms / Camera Rental Keywords
        const rentalKeywords = [
          // Business Terms
          'rental', 'rent', 'hire', 'booking', 'book', 'reserved', 'availability',
          'pickup', 'pick up', 'drop', 'return', 'deposit', 'security',
          'invoice', 'bill', 'quotation', 'quote', 'rate', 'price', 'gst', 'payment',
          'shoot', 'production', 'shift', 'call sheet', 'location',
          
          // Gear - Cameras
          'camera', 'body', 'sony', 'canon', 'nikon', 'blackmagic', 'arri', 'red',
          'fx3', 'fx6', 'fx9', 'a7s', 'a7iv', 'a7iii', 'alpha', 'cinema',
          
          // Gear - Lenses
          'lens', 'prime', 'zoom', 'gmaster', 'gm', '24-70', '70-200', '16-35', '50mm', '85mm', '35mm',
          
          // Gear - Accessories
          'tripod', 'gimbal', 'ronin', 'rs2', 'rs3', 'rs4', 'slider', 
          'monitor', 'atomos', 'wireless', 'video', 'transmission', 
          'light', 'aputure', 'godox', 'nanlite', 'softbox',
          'battery', 'vmount', 'charger', 'card', 'sd', 'cfexpress', 'memory'
        ];

        // 1. Check Contact Name (Optional: if you save clients with suffix 'P' or 'Z' or 'Rental')
        const lowerName = t.name.toLowerCase();
        const nameSignal = lowerName.includes('rental') || lowerName.includes('studio') || lowerName.includes('prod');
        
        // 2. Check Content (Strong Signal)
        // Scan all messages in the thread for rental keywords
        const contentSignal = t.messages.some(m => {
          const text = (m.content?.text || '').toLowerCase();
          return rentalKeywords.some(kw => text.includes(kw));
        });

        // 3. Check Priority (Urgent messages are usually work)
        const prioritySignal = t.hasUrgent;

        return nameSignal || contentSignal || prioritySignal;
      });
    }

    setFilteredThreads(result);
  }, [searchQuery, activeTab, threads]);

  const generateDraft = async (thread, tone = 'professional') => {
    const latestMsg = thread.messages[thread.messages.length - 1];
    try {
      setGenerating(latestMsg.id + '-' + tone); // Track which tone is being generated
      const res = await axios.post(`${API_URL}/process-ai`, {
        userId: latestMsg.senderId, // Context is fetched by backend using this ID
        message: latestMsg.content.text,
        tone: tone // 'professional' or 'personal'
      });
      
      setDrafts(prev => ({
        ...prev,
        [latestMsg.id]: res.data.draft // Single draft object based on tone
      }));
    } catch (err) {
      console.error("Failed to generate draft", err);
      alert("Failed to generate draft.");
    } finally {
      setGenerating(null);
    }
  };

  const sendDraft = async (to, text) => {
    if (!confirm(`Send this message?\n\n"${text}"`)) return;
    try {
      await axios.post(`${API_URL}/send`, { to, message: text });
      alert("Message sent!");
      setEditingDraft(null);
      fetchMessages();
    } catch (err) {
      alert("Failed to send message");
    }
  };

  const markThreadAsRead = async (thread) => {
    try {
      // Add to marking set for visual feedback
      setMarkingAsRead(prev => new Set([...prev, thread.id]));
      
      // Get all message IDs from this thread
      const messageIds = thread.messages.map(m => m.id);
      
      await axios.post(`${API_URL}/mark-read`, { messageIds });
      
      // Remove the thread from the display immediately for better UX
      setThreads(prevThreads => prevThreads.filter(t => t.id !== thread.id));
      setFilteredThreads(prevFiltered => prevFiltered.filter(t => t.id !== thread.id));
      
      // Clear selection if this thread was selected
      setSelectedThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(thread.id);
        return newSet;
      });
      
      console.log(`✅ Thread ${thread.name} marked as read and removed`);
      
    } catch (err) {
      console.error("Failed to mark as read:", err);
      alert("Failed to mark messages as read");
      // Refresh to get accurate state if something went wrong
      fetchMessages();
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(thread.id);
        return newSet;
      });
    }
  };

  const markSelectedThreadsAsRead = async () => {
    if (selectedThreads.size === 0) return;
    
    try {
      setMarkingAsRead(new Set(selectedThreads));
      
      const threadsToMark = threads.filter(t => selectedThreads.has(t.id));
      const allMessageIds = threadsToMark.flatMap(thread => thread.messages.map(m => m.id));
      
      await axios.post(`${API_URL}/mark-read`, { messageIds: allMessageIds });
      
      // Remove marked threads from display
      setThreads(prevThreads => prevThreads.filter(t => !selectedThreads.has(t.id)));
      setFilteredThreads(prevFiltered => prevFiltered.filter(t => !selectedThreads.has(t.id)));
      setSelectedThreads(new Set());
      setShowBulkActions(false);
      
      console.log(`✅ ${threadsToMark.length} threads marked as read`);
      
    } catch (err) {
      console.error("Failed to mark selected threads as read:", err);
      alert("Failed to mark selected threads as read");
      fetchMessages();
    } finally {
      setMarkingAsRead(new Set());
    }
  };

  const toggleThreadSelection = (threadId) => {
    setSelectedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      
      // Show bulk actions if any thread is selected
      setShowBulkActions(newSet.size > 0);
      
      return newSet;
    });
  };

  const markAllAsRead = async () => {
    try {
      if (filteredThreads.length === 0) {
        alert("No threads to mark as read");
        return;
      }
      
      if (!confirm(`Mark all ${filteredThreads.length} threads as read?`)) return;
      
      setMarkingAsRead(new Set(filteredThreads.map(t => t.id)));
      
      const allMessageIds = filteredThreads.flatMap(thread => thread.messages.map(m => m.id));
      
      await axios.post(`${API_URL}/mark-read`, { messageIds: allMessageIds });
      
      // Clear all threads from display
      setThreads([]);
      setFilteredThreads([]);
      setSelectedThreads(new Set());
      setShowBulkActions(false);
      
      console.log(`✅ All ${filteredThreads.length} threads marked as read`);
      
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      alert("Failed to mark all threads as read");
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
      const res = await axios.get(`${API_URL}/history/${thread.id}?limit=50`);
      // The history endpoint returns full conversation, we should sort it
      const history = res.data.history.sort((a, b) => a.timestamp - b.timestamp);
      setFullHistory(history);
      
      // Scroll to bottom
      setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      console.error("Failed to fetch history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Briefing Logic (Keep existing)
  const generateBriefing = async () => {
    setGeneratingBriefing(true);
    setShowBriefingModal(true); // Open modal immediately
    try {
      const res = await axios.get(`${API_URL}/briefing`);
      setBriefing(res.data.summary);
    } catch (err) {
      console.error('Briefing error:', err);
      setBriefing(`❌ Error generating briefing:\n\n${err.response?.data?.message || err.message}\n\nPlease make sure:\n1. WhatsApp is connected\n2. There are unread messages\n3. API keys are configured correctly`);
    } finally {
      setGeneratingBriefing(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <div className="max-w-[1600px] mx-auto">
        {/* Bulk Actions Toolbar */}
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

        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
            <MessageSquare className="w-8 h-8 text-green-600" />
            WhatsApp AI Agent
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-2">
               <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
               >All</button>
               <button 
                onClick={() => setActiveTab('work')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${activeTab === 'work' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
               >Work</button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40 md:w-64"
            />

            <button onClick={() => setAudioEnabled(!audioEnabled)} className="text-xl" title="Toggle Sound">
              {audioEnabled ? '🔔' : '🔇'}
            </button>
            <button 
              onClick={() => navigate('/tasks')} 
              className="p-2 rounded-full hover:bg-orange-50 text-orange-600"
              title="Auto-Detected Tasks"
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/templates')} 
              className="p-2 rounded-full hover:bg-purple-50 text-purple-600"
              title="Templates"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/telegram')}
              className="p-2 rounded-full hover:bg-sky-50 text-sky-600"
              title="Telegram Inbox"
            >
              💬
            </button>
            <button onClick={generateBriefing} disabled={generatingBriefing} className="p-2 rounded-full hover:bg-blue-50 text-blue-600">
              {generatingBriefing ? <RefreshCw className="animate-spin w-5 h-5"/> : '📋'}
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-full hover:bg-red-50 text-red-600"
              title="Log out and clear session"
            >
              {loggingOut ? <RefreshCw className="animate-spin w-5 h-5"/> : '⏏️'}
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

        {/* Thread Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredThreads.map(thread => {
            const latestMsg = thread.messages[thread.messages.length - 1];
            const hasDrafts = drafts[latestMsg.id];
            const isEditing = editingDraft?.msgId === latestMsg.id;
            
            return (
              <div 
                key={thread.id} 
                className={`bg-white rounded-xl shadow-sm border flex flex-col h-full transition hover:shadow-md ${
                  thread.hasUrgent ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-200'
                } ${
                  selectedThreads.has(thread.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''
                } ${
                  markingAsRead.has(thread.id) ? 'opacity-50' : ''
                }`}
              >
                {/* Thread Header with Enhanced Separators */}
                <div className={`px-4 py-3 border-b-2 ${
                  thread.hasUrgent 
                    ? 'bg-gradient-to-r from-red-50 via-red-50 to-red-100 border-red-200' 
                    : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Selection Checkbox with Enhanced Styling */}
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedThreads.has(thread.id)}
                          onChange={() => toggleThreadSelection(thread.id)}
                          className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                        />
                      </div>
                      
                      {/* Avatar with Enhanced Design */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 ${
                         thread.hasUrgent 
                           ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-300' 
                           : thread.isGroup 
                             ? 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-300'
                             : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300'
                      }`}>
                        {thread.hasUrgent ? <AlertTriangle size={20}/> : thread.isGroup ? <Users size={20}/> : <User size={20}/>}
                      </div>
                      
                      {/* Thread Info with Enhanced Typography */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-bold truncate text-sm ${
                            thread.hasUrgent ? 'text-red-900' : 'text-gray-900'
                          }`}>{thread.name}</h3>
                          
                          {/* Status Indicators */}
                          <div className="flex items-center gap-1">
                            {thread.unreadCount > 0 && (
                              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                {thread.unreadCount}
                              </span>
                            )}
                            {thread.hasSentMessages && (
                              <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm" title="Contains sent messages">
                                📤
                              </span>
                            )}
                            {thread.hasUrgent && (
                              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-bounce" title="Urgent messages">
                                ⚠️
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Timestamp and Thread Type */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-medium ${
                            thread.hasUrgent ? 'text-red-700' : 'text-gray-500'
                          }`}>
                            {new Date(thread.lastTimestamp * 1000).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          
                          {/* Separator Dot */}
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          
                          <span className={`font-medium ${
                            thread.isGroup ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {thread.isGroup ? 'Group Chat' : 'Direct Message'}
                          </span>
                          
                          {/* Separator Dot */}
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          
                          <span className="text-gray-400">
                            {thread.messages.length} messages
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons with Enhanced Styling */}
                    <div className="flex items-center gap-1">
                      {/* Mark as Read Button */}
                      {thread.unreadCount > 0 && (
                        <button 
                          onClick={() => markThreadAsRead(thread)}
                          disabled={markingAsRead.has(thread.id)}
                          className="group flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-full text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Mark as Read"
                        >
                          {markingAsRead.has(thread.id) ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span className="hidden sm:inline">Read</span>
                        </button>
                      )}
                      
                      {/* History Button */}
                      <button 
                        onClick={() => openHistory(thread)}
                        className="group p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="View Full History"
                      >
                        <History size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Bottom Separator Line */}
                  <div className={`mt-3 h-px bg-gradient-to-r ${
                    thread.hasUrgent 
                      ? 'from-transparent via-red-300 to-transparent'
                      : 'from-transparent via-gray-300 to-transparent'
                  }`}></div>
                </div>

                {/* Chat Bubbles (Show last 5 with direction indicators) */}
                <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden bg-gradient-to-b from-white/50 to-gray-50/30">
                  {thread.messages.slice(-5).map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex flex-col max-w-[90%] ${
                      msg.fromMe ? 'self-end items-end ml-12' : 'self-start items-start mr-12'
                    } animate-fade-in`}>
                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-lg border-2 ${
                        msg.fromMe 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-300 rounded-tr-sm' 
                          : msg.priority === 'high'
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-900 rounded-tl-sm' 
                            : 'bg-gradient-to-br from-white to-gray-50 border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        <div className="flex items-start gap-2">
                          {!msg.fromMe && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              thread.hasUrgent ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {thread.isGroup ? (thread.name.charAt(0).toUpperCase()) : (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?')}
                            </div>
                          )}
                          <div className="flex-1">
                            {!thread.isGroup && !msg.fromMe && msg.senderName && (
                              <div className="text-xs font-medium text-gray-600 mb-1 opacity-75">
                                {msg.senderName}
                              </div>
                            )}
                            <div className="leading-relaxed">{msg.content.text}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Message Info with Direction Indicator */}
                      <div className={`flex items-center gap-2 mt-1 text-[10px] ${
                        msg.fromMe ? 'flex-row-reverse text-blue-600' : 'text-gray-400'
                      }`}>
                        <div className="flex items-center gap-1">
                          {msg.fromMe ? (
                            <>
                              <div className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              </div>
                              <span className="font-medium">Sent</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 rounded-full bg-gray-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                              </div>
                              <span className="font-medium">Received</span>
                            </>
                          )}
                        </div>
                        <div className="h-3 w-px bg-gray-200"></div>
                        <span>
                          {new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {msg.priority === 'high' && !msg.fromMe && (
                          <>
                            <div className="h-3 w-px bg-gray-200"></div>
                            <span className="text-red-500 font-bold">⚠️ URGENT</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Separator for thread end */}
                  <div className="mt-2 border-t border-gray-200/50"></div>
                  
                  {/* Thread Summary */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                    <div className="flex items-center gap-2">
                      {thread.hasSentMessages && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span>Sent messages</span>
                        </div>
                      )}
                      {thread.unreadCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>{thread.unreadCount} unread</span>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400">
                      {thread.messages.length} total
                    </div>
                  </div>
                </div>

                {/* Actions / Draft Area */}
                <div className="p-4 border-t bg-gray-50 rounded-b-xl">
                  {isEditing ? (
                    <div className="bg-white p-2 rounded-lg border border-blue-200 shadow-inner">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-blue-600 uppercase">Editing Draft</span>
                        <button onClick={() => setEditingDraft(null)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                      </div>
                      <textarea 
                        className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                        rows={3}
                        value={editingDraft.text}
                        onChange={(e) => setEditingDraft({...editingDraft, text: e.target.value})}
                      />
                      <button 
                        onClick={() => sendDraft(thread.id, editingDraft.text)}
                        className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex justify-center items-center gap-2"
                      >
                        <Send size={14} /> Send Now
                      </button>
                    </div>
                  ) : hasDrafts ? (
                    <div className="flex flex-col gap-2">
                       <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                         <span className="flex items-center gap-1">
                           <Sparkles size={12} /> 
                           {hasDrafts.tone === 'professional' ? 'Professional Reply' : 'Personal & Warm Reply'}
                         </span>
                         <button onClick={() => setDrafts({...drafts, [latestMsg.id]: null})}><X size={12}/></button>
                       </div>
                       <div className="bg-white border border-blue-100 p-3 rounded-lg shadow-sm">
                         <p className="text-sm text-gray-700 mb-3 leading-relaxed">{hasDrafts.text}</p>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setEditingDraft({ msgId: latestMsg.id, text: hasDrafts.text })}
                             className="flex-1 bg-gray-50 border hover:bg-white text-xs py-2 rounded flex items-center justify-center gap-1 text-gray-600"
                           >
                             <Pencil size={12} /> Edit
                           </button>
                           <button 
                             onClick={() => sendDraft(thread.id, hasDrafts.text)}
                             className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs py-2 rounded flex items-center justify-center gap-1 text-white font-medium"
                           >
                             <Send size={12} /> Send Now
                           </button>
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                        Generate Reply
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => generateDraft(thread, 'professional')}
                          disabled={generating?.startsWith(latestMsg.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {generating === latestMsg.id + '-professional' ? (
                            <RefreshCw className="animate-spin w-4 h-4"/>
                          ) : (
                            <>
                              <span className="text-base">1️⃣</span>
                              <span>Professional</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => generateDraft(thread, 'personal')}
                          disabled={generating?.startsWith(latestMsg.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {generating === latestMsg.id + '-personal' ? (
                            <RefreshCw className="animate-spin w-4 h-4"/>
                          ) : (
                            <>
                              <span className="text-base">2️⃣</span>
                              <span>Personal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full History Modal */}
      {historyModalOpen && selectedThread && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${selectedThread.hasUrgent ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {selectedThread.isGroup ? <Users size={20}/> : <User size={20}/>}
                 </div>
                 <div>
                   <h2 className="font-bold text-gray-900">{selectedThread.name}</h2>
                   <p className="text-xs text-gray-500">{selectedThread.id}</p>
                 </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
            </div>

            {/* Modal Body (Chat) */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#efeae2] flex flex-col gap-3">
               {loadingHistory ? (
                 <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-gray-400"/></div>
               ) : (
                 fullHistory.map((msg, idx) => (
                   <div key={idx} className={`flex flex-col max-w-[80%] ${msg.fromMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`px-4 py-2 rounded-lg shadow-sm text-sm ${
                        msg.fromMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'
                      }`}>
                        {msg.message || msg.content?.text || '[Media/Other]'}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">
                        {new Date(msg.timestamp * 1000).toLocaleString()}
                      </span>
                   </div>
                 ))
               )}
               <div ref={historyEndRef} />
            </div>

            {/* Modal Footer (Quick Send) */}
            <div className="p-4 border-t bg-white rounded-b-2xl">
               {/* Could add quick reply input here later */}
               <button onClick={() => setHistoryModalOpen(false)} className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Briefing Modal (Reused) */}
      {/* Enhanced Briefing Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-3xl">📊</span> 
                    <span>AI Message Briefing</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Intelligent analysis of your unread messages</p>
                </div>
                <button 
                  onClick={() => setShowBriefingModal(false)} 
                  className="p-2 rounded-full hover:bg-white/50 text-gray-500 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {generatingBriefing ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600 text-lg">Analyzing your messages...</p>
                  <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
                </div>
              ) : briefing ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                      {briefing}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={fetchMessages}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Messages
                    </button>
                    <button 
                      onClick={() => {
                        setShowBriefingModal(false);
                        setActiveTab('all');
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition"
                    >
                      View All Threads
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-lg">No briefing data available</p>
                  <button 
                    onClick={generateBriefing}
                    className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition"
                  >
                    Generate Briefing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
