import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, CheckCircle, Clock, User, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingToTodoist, setAddingToTodoist] = useState(null);

  const fetchDetectedTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/tasks/detected?limit=100`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch detected tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetectedTasks();
  }, []);

  const addTaskToTodoist = async (task) => {
    try {
      setAddingToTodoist(task.id);
      await axios.post(`${API_URL}/tasks/todoist/add`, { task: task.task });
      alert(`✅ Task added to Todoist: "${task.task.task}"`);
    } catch (err) {
      console.error("Failed to add to Todoist:", err);
      alert("Failed to add task to Todoist. Check your API key configuration.");
    } finally {
      setAddingToTodoist(null);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700 border-red-300';
      case 2: return 'bg-orange-100 text-orange-700 border-orange-300';
      case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 4: return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1: return 'Urgent';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      default: return 'Normal';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              🤖 Auto-Detected Tasks
            </h1>
          </div>
          <button
            onClick={fetchDetectedTasks}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Refresh tasks"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Automatic Task Detection
              </h3>
              <p className="text-sm text-blue-700">
                Tasks are automatically detected from incoming WhatsApp messages using AI. 
                Review them here and add to Todoist with one click.
              </p>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {loading && tasks.length === 0 ? (
            <div className="text-center py-16">
              <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading detected tasks…</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">No tasks detected yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Tasks will appear here when detected from your WhatsApp messages
              </p>
            </div>
          ) : (
            tasks.map((detectedTask) => (
              <div
                key={detectedTask.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Task Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {detectedTask.task.task}
                        </h3>
                        
                        {/* Task Metadata */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {/* Priority Badge */}
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getPriorityColor(detectedTask.task.priority)}`}>
                            {getPriorityLabel(detectedTask.task.priority)}
                          </span>
                          
                          {/* Category Badge */}
                          {detectedTask.task.category && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                              {detectedTask.task.category}
                            </span>
                          )}
                          
                          {/* Deadline Badge */}
                          {detectedTask.task.deadline && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {detectedTask.task.deadline}
                            </span>
                          )}
                        </div>

                        {/* Context */}
                        {detectedTask.task.context && (
                          <p className="text-sm text-gray-600 mb-2">
                            💡 {detectedTask.task.context}
                          </p>
                        )}

                        {/* Sender Info */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-4 h-4" />
                          <span>From: {detectedTask.senderName}</span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {new Date(detectedTask.detectedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => addTaskToTodoist(detectedTask)}
                    disabled={addingToTodoist === detectedTask.id}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
                  >
                    {addingToTodoist === detectedTask.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      '+ Add to Todoist'
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
