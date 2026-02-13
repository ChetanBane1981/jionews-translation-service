import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { getApprovalQueue, approveNews, rejectNews } from '../services/api'
import type { NewsItem } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function ApprovalQueue() {
  const [queue, setQueue] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    setLoading(true)
    try {
      const response = await getApprovalQueue()
      setQueue(response.data || [])
    } catch (error) {
      console.error('Failed to load approval queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (item: NewsItem) => {
    try {
      await approveNews(item.id, 'admin') // In production, use actual user ID
      setQueue(queue.filter(i => i.id !== item.id))
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('Failed to approve item')
    }
  }

  const handleReject = async () => {
    if (!selectedItem || !rejectReason.trim()) return

    try {
      await rejectNews(selectedItem.id, 'admin', rejectReason)
      setQueue(queue.filter(i => i.id !== selectedItem.id))
      setShowRejectDialog(false)
      setRejectReason('')
      setSelectedItem(null)
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Failed to reject item')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-gray-600 mt-1">
          Review high-risk articles flagged by autonomous agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-3xl font-bold mt-1">{queue.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Credibility</p>
              <p className="text-3xl font-bold mt-1">
                {queue.length > 0
                  ? Math.round(queue.reduce((sum, item) => sum + (item.credibilityScore || 0), 0) / queue.length)
                  : 0}
              </p>
            </div>
            <Info className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk Items</p>
              <p className="text-3xl font-bold mt-1">
                {queue.filter(item => item.fakeRisk === 'High').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : queue.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-2">No articles pending approval</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item)}
              onReject={() => {
                setSelectedItem(item)
                setShowRejectDialog(true)
              }}
            />
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Article</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this article:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectReason('')
                  setSelectedItem(null)
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ApprovalCardProps {
  item: NewsItem
  onApprove: () => void
  onReject: () => void
}

function ApprovalCard({ item, onApprove, onReject }: ApprovalCardProps) {
  return (
    <div className="card">
      <div className="flex gap-6">
        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg">{item.title}</h3>

          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-gray-600">{item.summary}</p>
          )}

          {/* Flags */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.credibilityScore && item.credibilityScore >= 70
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Credibility: {item.credibilityScore || 0}%
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.fakeRisk === 'High'
                ? 'bg-red-100 text-red-800'
                : item.fakeRisk === 'Medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              Fake Risk: {item.fakeRisk || 'Unknown'}
            </div>
            {item.category && (
              <span className="badge badge-info">{item.category}</span>
            )}
          </div>

          {/* Reason for Approval */}
          {item.approvalReason && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <p className="text-sm font-medium text-yellow-900">Flagged Because:</p>
              <p className="text-sm text-yellow-800 mt-1">{item.approvalReason}</p>
            </div>
          )}

          {/* Red Flags */}
          {item.redFlags && item.redFlags.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="text-sm font-medium text-red-900">Red Flags:</p>
              <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                {item.redFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t">
            <span>Source: {item.sourceName || 'Unknown'}</span>
            <span>•</span>
            <span>{item.publishedAt && formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onApprove}
            className="btn btn-success flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={onReject}
            className="btn btn-danger flex items-center gap-2 whitespace-nowrap"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
