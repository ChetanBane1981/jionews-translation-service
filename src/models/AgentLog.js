import mongoose from 'mongoose';

/**
 * AgentLog Schema - Tracks all agent activities for monitoring
 */
const agentLogSchema = new mongoose.Schema({
  // Agent Info
  agentName: {
    type: String,
    required: true,
    index: true
  },

  // Task Info
  taskId: String,
  newsId: String,

  // Event
  eventType: {
    type: String,
    enum: [
      'task_started',
      'task_completed',
      'task_failed',
      'decision_made',
      'approval_requested',
      'error',
      'warning'
    ],
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    required: true
  },

  // Details
  message: String,
  data: mongoose.Schema.Types.Mixed,
  error: String,
  stackTrace: String,

  // Performance
  duration: Number, // milliseconds
  memoryUsage: Number,

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  timestamps: true,
  collection: 'agent_logs'
});

// Indexes for queries
agentLogSchema.index({ agentName: 1, timestamp: -1 });
agentLogSchema.index({ eventType: 1, timestamp: -1 });
agentLogSchema.index({ status: 1, timestamp: -1 });
agentLogSchema.index({ newsId: 1 });

// TTL Index - Auto-delete logs older than 30 days
agentLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Statics
agentLogSchema.statics.logEvent = async function(agentName, eventType, status, data) {
  return this.create({
    agentName,
    eventType,
    status,
    message: data.message,
    data: data.data || {},
    error: data.error,
    stackTrace: data.stackTrace,
    duration: data.duration,
    taskId: data.taskId,
    newsId: data.newsId
  });
};

agentLogSchema.statics.getAgentStats = async function(agentName, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        agentName,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);

  return stats;
};

const AgentLog = mongoose.model('AgentLog', agentLogSchema);

export default AgentLog;
