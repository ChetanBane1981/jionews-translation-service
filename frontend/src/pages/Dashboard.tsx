import { useEffect, useState } from 'react'
import { Newspaper, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react'
import { getSystemMetrics, getHealth } from '../services/api'
import type { SystemMetrics, SystemHealth } from '../types'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [metricsData, healthData] = await Promise.all([
        getSystemMetrics(),
        getHealth()
      ])
      setMetrics(metricsData.data)
      setHealth(healthData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Autonomous AI Newsroom Overview</p>
      </div>

      {/* System Health */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">System Health</h2>
            <p className="text-sm text-gray-600">All systems operational</p>
          </div>
          <div className={`px-4 py-2 rounded-full ${
            health?.status === 'healthy'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {health?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total News"
          value={metrics?.news.total || 0}
          icon={<Newspaper className="w-6 h-6 text-blue-600" />}
          subtitle="Articles processed"
        />
        <MetricCard
          title="Published"
          value={metrics?.news.published || 0}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          subtitle="Live articles"
        />
        <MetricCard
          title="Pending Approval"
          value={metrics?.news.pendingApproval || 0}
          icon={<AlertCircle className="w-6 h-6 text-yellow-600" />}
          subtitle="Needs review"
        />
        <MetricCard
          title="Breaking News"
          value={metrics?.news.breaking || 0}
          icon={<TrendingUp className="w-6 h-6 text-red-600" />}
          subtitle="Active breaking"
        />
      </div>

      {/* Queue Status */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Agent Queue Status</h2>
        <div className="space-y-3">
          {metrics?.queues && Object.entries(metrics.queues).map(([name, stats]) => (
            <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium capitalize">{name}</div>
                <div className="text-sm text-gray-600">
                  {stats.active} active · {stats.waiting} waiting · {stats.completed} completed
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{stats.total}</div>
                <div className="text-xs text-gray-500">total</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction
          title="View News Feed"
          description="Browse all published articles"
          link="/news"
          icon={<Newspaper />}
        />
        <QuickAction
          title="Approval Queue"
          description="Review pending articles"
          link="/approval"
          icon={<CheckCircle />}
          badge={metrics?.news.pendingApproval}
        />
        <QuickAction
          title="Agent Monitoring"
          description="Monitor agent performance"
          link="/agents"
          icon={<Users />}
        />
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle: string;
}

function MetricCard({ title, value, icon, subtitle }: MetricCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  )
}

interface QuickActionProps {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  badge?: number;
}

function QuickAction({ title, description, link, icon, badge }: QuickActionProps) {
  return (
    <a href={link} className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start">
        <div className="p-3 bg-primary-50 rounded-lg mr-4">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            {badge && badge > 0 && (
              <span className="badge badge-warning">{badge}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </a>
  )
}
