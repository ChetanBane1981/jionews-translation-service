import { useEffect, useState } from 'react'
import { BarChart, LineChart, Activity, Database, Cpu, HardDrive } from 'lucide-react'
import { getSystemMetrics, getHealth } from '../services/api'
import type { SystemMetrics as Metrics, SystemHealth } from '../types'

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000) // Refresh every 15s
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [metricsData, healthData] = await Promise.all([
        getSystemMetrics(),
        getHealth()
      ])
      setMetrics(metricsData.data ?? null)
      setHealth(healthData)
    } catch (error) {
      console.error('Failed to load metrics:', error)
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
        <h1 className="text-3xl font-bold text-gray-900">System Metrics</h1>
        <p className="text-gray-600 mt-1">Performance and health monitoring</p>
      </div>

      {/* System Health */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">System Health</h2>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            health?.status === 'healthy'
              ? 'bg-green-100 text-green-800'
              : health?.status === 'degraded'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {health?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Database */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium">Database</h3>
            </div>
            <div className={`text-sm ${
              health?.checks.database?.healthy ? 'text-green-600' : 'text-red-600'
            }`}>
              {health?.checks.database?.healthy ? '✓ Connected' : '✗ Disconnected'}
            </div>
            {health?.checks.database?.status && (
              <div className="text-xs text-gray-600 mt-2">
                {health.checks.database.status.name || 'N/A'}
              </div>
            )}
          </div>

          {/* Queue */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium">Queue System</h3>
            </div>
            <div className={`text-sm ${
              health?.checks.queue?.healthy ? 'text-green-600' : 'text-red-600'
            }`}>
              {health?.checks.queue?.healthy ? '✓ Operational' : '✗ Down'}
            </div>
            {health?.checks.queue?.queues && (
              <div className="text-xs text-gray-600 mt-2">
                {health.checks.queue.queues} queues
              </div>
            )}
          </div>

          {/* System */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-5 h-5 text-green-600" />
              <h3 className="font-medium">System</h3>
            </div>
            <div className="text-sm text-green-600">✓ Running</div>
            {health?.checks.system && 'cpu' in health.checks.system && (
              <div className="text-xs text-gray-600 mt-2">
                {health.checks.system.cpu.cores} cores
              </div>
            )}
          </div>
        </div>
      </div>

      {/* News Metrics */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">News Pipeline Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricBox
            label="Total Articles"
            value={metrics?.news.total || 0}
            icon={<BarChart className="w-5 h-5 text-blue-600" />}
          />
          <MetricBox
            label="Published"
            value={metrics?.news.published || 0}
            icon={<LineChart className="w-5 h-5 text-green-600" />}
            percentage={metrics?.news.total ? Math.round((metrics.news.published / metrics.news.total) * 100) : 0}
          />
          <MetricBox
            label="Pending Approval"
            value={metrics?.news.pendingApproval || 0}
            icon={<Activity className="w-5 h-5 text-yellow-600" />}
          />
          <MetricBox
            label="Breaking News"
            value={metrics?.news.breaking || 0}
            icon={<Activity className="w-5 h-5 text-red-600" />}
          />
        </div>
      </div>

      {/* Queue Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Queue Performance</h2>
        <div className="space-y-4">
          {metrics?.queues && Object.entries(metrics.queues).map(([name, stats]) => (
            <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium capitalize">{name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.completed} completed · {stats.failed} failed · {stats.active} active
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  stats.failed === 0 ? 'text-green-600' : stats.failed < 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.completed > 0
                    ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
                    : 100}%
                </div>
                <div className="text-xs text-gray-500">success rate</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Resources */}
      {health?.checks.system && 'memory' in health.checks.system && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">System Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium">Memory</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used</span>
                  <span className="font-medium">{health.checks.system.memory.used}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{health.checks.system.memory.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${health.checks.system.memory.usagePercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium">CPU</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cores</span>
                  <span className="font-medium">{health.checks.system.cpu.cores}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Node Version</span>
                  <span className="font-medium">{health.checks.system.nodeVersion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MetricBoxProps {
  label: string
  value: number
  icon: React.ReactNode
  percentage?: number
}

function MetricBox({ label, value, icon, percentage }: MetricBoxProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      {percentage !== undefined && (
        <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
      )}
    </div>
  )
}
