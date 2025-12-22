import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Plus, Edit, Trash2, Copy, Search, Tag, TrendingUp, 
  Clock, Sparkles, X, Save, AlertCircle 
} from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [stats, setStats] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    text: '',
    category: 'personal',
    shortcuts: '',
    tags: ''
  });

  const [variables, setVariables] = useState({});

  const categories = ['all', 'business', 'personal', 'inquiry', 'follow-up', 'greeting', 'closing'];

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/templates`);
      setTemplates(res.data.templates);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates/stats`);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post(`${API_URL}/templates`, {
        name: formData.name,
        text: formData.text,
        category: formData.category,
        shortcuts: formData.shortcuts.split(',').map(s => s.trim()).filter(Boolean),
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean)
      });
      setShowCreateModal(false);
      setFormData({ name: '', text: '', category: 'personal', shortcuts: '', tags: '' });
      fetchTemplates();
      fetchStats();
    } catch (err) {
      alert('Error creating template');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API_URL}/templates/${id}`);
      fetchTemplates();
      fetchStats();
    } catch (err) {
      alert('Error deleting template');
    }
  };

  const handleUse = async () => {
    try {
      const res = await axios.post(`${API_URL}/templates/${selectedTemplate.id}/use`, { variables });
      
      // Copy to clipboard
      await navigator.clipboard.writeText(res.data.text);
      alert('Template copied to clipboard!');
      
      setShowUseModal(false);
      setSelectedTemplate(null);
      setVariables({});
      fetchTemplates();
      fetchStats();
    } catch (err) {
      alert('Error using template');
    }
  };

  const openUseModal = (template) => {
    setSelectedTemplate(template);
    const vars = {};
    template.variables.forEach(v => vars[v] = '');
    setVariables(vars);
    setShowUseModal(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Template Library
              </h1>
              <p className="text-gray-600 mt-1">Quick access to your message templates</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              New Template
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-gray-600 text-sm">Total Templates</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-gray-600 text-sm">Total Usage</div>
              <div className="text-3xl font-bold text-green-600">{stats.totalUsage}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-gray-600 text-sm">Categories</div>
              <div className="text-3xl font-bold text-purple-600">{Object.keys(stats.byCategory).length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-gray-600 text-sm">Most Used</div>
              <div className="text-lg font-bold text-blue-600">
                {stats.mostUsed[0]?.name.substring(0, 20) || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No templates found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{template.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {template.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openUseModal(template)}
                      className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                      title="Use template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{template.text}</p>

                {template.variables.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Variables:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map(v => (
                        <span key={v} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Used {template.usageCount} times
                  </span>
                  {template.lastUsed && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(template.lastUsed).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Template</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Property Inquiry Response"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Text</label>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={5}
                    placeholder="Use {{variable}} for dynamic content. E.g., Hi {{name}}, thanks for..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {`{{variable}}`} syntax for dynamic content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shortcuts (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.shortcuts}
                    onChange={(e) => setFormData({...formData, shortcuts: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="prop, inquiry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="real-estate, urgent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.text}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Use Template Modal */}
        {showUseModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Use Template</h2>
                <button onClick={() => setShowUseModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                <p className="text-gray-600 text-sm">{selectedTemplate.text}</p>
              </div>

              {selectedTemplate.variables.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-medium text-gray-900">Fill in variables:</h4>
                  {selectedTemplate.variables.map(v => (
                    <div key={v}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{v}</label>
                      <input
                        type="text"
                        value={variables[v] || ''}
                        onChange={(e) => setVariables({...variables, [v]: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder={`Enter ${v}...`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUse}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}