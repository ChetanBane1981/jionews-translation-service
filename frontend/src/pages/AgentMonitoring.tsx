import { useEffect, useState } from 'react'
import { Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { getAgentStatus } from '../services/api'
import type { QueueStats, AgentLog } from '../types'

export default function AgentMonitoring() {
  const [queues, setQueues] = useState<Record<string, QueueStats>>({})
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const response = await getAgentStatus()
      setQueues(response.data?.queues || {})
      setLogs(response.data?.recentLogs || [])
    } catch (error) {
      console.error('Failed to load agent status:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalActive = Object.values(queues).reduce((sum, q) => sum + q.active, 0)
  const totalWaiting = Object.values(queues).reduce((sum, q) => sum + q.waiting, 0)
  const totalCompleted = Object.values(queues).reduce((sum, q) => sum + q.completed, 0)
  const totalFailed = Object.values(queues).reduce((sum, q) => sum + q.failed, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Agent Monitoring</h1>
        <p className="text-gray-600 mt-1">Real-time monitoring of autonomous agents</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Jobs</p>
              <p className="text-3xl font-bold mt-1">{totalActive}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Waiting</p>
              <p className="text-3xl font-bold mt-1">{totalWaiting}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold mt-1">{totalCompleted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-3xl font-bold mt-1">{totalFailed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Agent Queue Status */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Agent Queues</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(queues).map(([name, stats]) => (
              <AgentQueueCard key={name} name={name} stats={stats} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
          ) : (
            logs.slice(0, 20).map((log, idx) => (
              <ActivityLogItem key={idx} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface AgentQueueCardProps {
  name: string
  stats: QueueStats
}

function AgentQueueCard({ name, stats }: AgentQueueCardProps) {
  const successRate = stats.completed > 0
    ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
    : 100

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium capitalize">{name}</h3>
          <p className="text-sm text-gray-600">
            {stats.active} active · {stats.waiting} waiting
          </p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${
            successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {successRate}% success
          </div>
          <div className="text-xs text-gray-500">
            {stats.completed} completed
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, (stats.active / (stats.total || 1)) * 100)}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
        <span>Total: {stats.total}</span>
        {stats.failed > 0 && (
          <span className="text-red-600">{stats.failed} failed</span>
        )}
        {stats.delayed > 0 && (
          <span className="text-yellow-600">{stats.delayed} delayed</span>
        )}
      </div>
    </div>
  )
}

interface ActivityLogItemProps {
  log: AgentLog
}

function ActivityLogItem({ log }: ActivityLogItemProps) {
  const getIcon = () => {
    switch (log.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <Activity className="w-4 h-4 text-yellow-500" />
      default:
        return <Zap className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-medium text-sm capitalize">{log.agentName}</span>
            <span className="text-gray-500 text-sm ml-2">{log.eventType.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {log.duration && `${log.duration}ms`}
          </span>
        </div>
        {log.message && (
          <p className="text-sm text-gray-600 mt-1 truncate">{log.message}</p>
        )}
        {log.error && (
          <p className="text-sm text-red-600 mt-1 truncate">{log.error}</p>
        )}
      </div>
    </div>
  )
}
