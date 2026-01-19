import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Search, Filter, Plus, Sparkles, Copy, Edit, Trash2, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/templates`);
      setTemplates(res.data.templates || []);
      setFilteredTemplates(res.data.templates || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to fetch templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(term) || 
        t.content.toLowerCase().includes(term)
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, selectedCategory]);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy');
    }
  };

  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Sparkles className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchTemplates}
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
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="text-blue-500" size={24} />
                  Template Library
                </h1>
                {lastUpdated && (
                  <p className="text-sm text-gray-600">Last updated at {formatTime(lastUpdated)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchTemplates}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={16} />
                New Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search templates…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search templates"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Filter className="text-gray-400" size={20} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FileText className="text-gray-400 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No templates found</h3>
            <p className="text-gray-600">Try adjusting your search or create a new template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">{template.title}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {template.category || 'General'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(template.content)}
                      className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg"
                      aria-label="Copy template"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-lg"
                      aria-label="Edit template"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg"
                      aria-label="Delete template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap mb-4 line-clamp-4">{template.content}</p>
                <div className="text-xs text-gray-500">
                  Last used: {template.lastUsed ? new Date(template.lastUsed).toLocaleDateString() : 'Never'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
