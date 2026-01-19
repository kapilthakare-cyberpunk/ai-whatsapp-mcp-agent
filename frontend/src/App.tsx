import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import BriefingPage from './BriefingPage';
import TasksPage from './TasksPage';
import TemplatesPage from './TemplatesPage';
import TelegramDashboard from './TelegramDashboard';

export default function App() {
  return (
    <Router>
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <main id="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/briefing" element={<BriefingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/telegram" element={<TelegramDashboard />} />
        </Routes>
      </main>
    </Router>
  );
}
