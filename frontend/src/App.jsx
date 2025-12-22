import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import BriefingPage from './BriefingPage';
import TemplatesPage from './TemplatesPage';
import TasksPage from './TasksPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Routes>
    </Router>
  );
}

export default App;