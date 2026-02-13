import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewsFeed from './pages/NewsFeed'
import ApprovalQueue from './pages/ApprovalQueue'
import AgentMonitoring from './pages/AgentMonitoring'
import SystemMetrics from './pages/SystemMetrics'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/news" element={<NewsFeed />} />
          <Route path="/approval" element={<ApprovalQueue />} />
          <Route path="/agents" element={<AgentMonitoring />} />
          <Route path="/metrics" element={<SystemMetrics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
