import mongoose from 'mongoose';

/**
 * ApprovalGate Model - Human approval checkpoint in SDLC workflow
 * Used by HumanGateAgent for managing approval workflows
 */

const approvalGateSchema = new mongoose.Schema({
  // Basic Information
  gateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,

  // Gate Type
  type: {
    type: String,
    enum: [
      'story-review',         // PM reviews story after research
      'story-approval',       // PM approves story for development
      'technical-review',     // Technical review of approach
      'code-review',          // Code review checkpoint
      'test-approval',        // Test results approval
      'final-walkthrough',    // Final demo/walkthrough
      'production-ready',     // Production deployment approval
      'security-review',      // Security checkpoint
      'compliance-check'      // Compliance/regulatory check
    ],
    required: true
  },

  // Associated Entity
  entity: {
    type: {
      type: String,
      enum: ['user-story', 'task', 'test-case', 'release'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    entityTitle: String
  },

  // Checklist
  checklist: [{
    item: String,
    description: String,
    required: { type: Boolean, default: true },
    checked: { type: Boolean, default: false },
    checkedBy: String,
    checkedAt: Date,
    notes: String,
    category: {
      type: String,
      enum: ['functional', 'quality', 'security', 'performance', 'compliance', 'documentation']
    }
  }],

  // Approval Criteria
  criteria: {
    requiresAllChecklist: { type: Boolean, default: true },
    minChecklistPercentage: { type: Number, min: 0, max: 100, default: 100 },
    requiresApproverSignoff: { type: Boolean, default: true },
    allowAutoApproval: { type: Boolean, default: false },
    autoApprovalConditions: [String]
  },

  // Status
  status: {
    type: String,
    enum: [
      'pending',              // Awaiting review
      'in-review',            // Being reviewed
      'approved',             // Approved to proceed
      'rejected',             // Rejected, needs rework
      'revision-required',    // Needs minor changes
      'bypassed',             // Skipped (exceptional)
      'expired'               // Expired without action
    ],
    default: 'pending',
    index: true
  },

  // Approvers
  approvers: [{
    role: {
      type: String,
      enum: ['product-manager', 'project-manager', 'tech-lead', 'qa-lead', 'security-officer', 'compliance-officer'],
      required: true
    },
    userId: String,
    name: String,
    email: String,
    required: { type: Boolean, default: true },
    approved: { type: Boolean, default: false },
    approvedAt: Date,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'revision-required', 'pending']
    },
    comments: String,
    reviewDuration: Number    // Time spent reviewing (minutes)
  }],

  // Decision
  decision: {
    finalDecision: {
      type: String,
      enum: ['approved', 'rejected', 'revision-required'],
    },
    decidedBy: String,
    decidedAt: Date,
    reasoning: String,
    recommendations: [String],
    conditions: [String]      // Conditions for approval (e.g., "fix security issue X")
  },

  // Attachments & Evidence
  attachments: [{
    type: {
      type: String,
      enum: ['screenshot', 'document', 'code', 'test-report', 'demo-video', 'audit-log']
    },
    url: String,
    filename: String,
    uploadedBy: String,
    uploadedAt: Date,
    description: String
  }],

  // Comments & Discussion
  comments: [{
    author: String,
    role: String,
    comment: String,
    type: {
      type: String,
      enum: ['question', 'concern', 'suggestion', 'blocker', 'info']
    },
    createdAt: Date,
    resolved: { type: Boolean, default: false },
    resolvedBy: String,
    resolvedAt: Date
  }],

  // SLA & Timing
  sla: {
    targetReviewTime: Number,      // Expected review time (hours)
    actualReviewTime: Number,      // Actual time taken
    dueDate: Date,
    reminderSentAt: Date,
    escalatedAt: Date,
    escalatedTo: String
  },

  // Iteration Tracking
  iteration: {
    iterationNumber: { type: Number, default: 1 },
    previousGateId: String,        // Previous version of this gate
    changesFromPrevious: [String],
    resubmittedAt: Date
  },

  // Automation
  automation: {
    autoChecksPassed: { type: Boolean, default: false },
    autoChecks: [{
      check: String,
      result: {
        type: String,
        enum: ['passed', 'failed', 'warning']
      },
      details: String,
      executedAt: Date
    }],
    recommendedDecision: {
      type: String,
      enum: ['approve', 'reject', 'needs-review']
    },
    confidence: { type: Number, min: 0, max: 100 }  // AI confidence in recommendation
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  reviewStartedAt: Date,
  reviewCompletedAt: Date,

  // Metadata
  metadata: {
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    },
    workflow: String,          // Which workflow this gate belongs to
    phase: String,             // SDLC phase (planning, development, testing, deployment)
    bypassable: { type: Boolean, default: false },
    bypassReason: String,
    bypassedBy: String,
    bypassedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
approvalGateSchema.index({ status: 1, 'sla.dueDate': 1 });
approvalGateSchema.index({ 'entity.type': 1, 'entity.entityId': 1 });
approvalGateSchema.index({ type: 1, status: 1 });
approvalGateSchema.index({ 'approvers.userId': 1, status: 1 });

// Pre-save middleware
approvalGateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate actual review time if completed
  if (this.reviewStartedAt && this.reviewCompletedAt && !this.sla.actualReviewTime) {
    const duration = this.reviewCompletedAt - this.reviewStartedAt;
    this.sla.actualReviewTime = Math.round(duration / (1000 * 60 * 60) * 10) / 10; // Hours
  }

  // Check if all required approvers have approved
  const requiredApprovers = this.approvers.filter(a => a.required);
  const allApproved = requiredApprovers.every(a => a.approved);

  if (allApproved && this.status === 'in-review') {
    this.status = 'approved';
    this.decision.finalDecision = 'approved';
    this.decision.decidedAt = Date.now();
    this.reviewCompletedAt = Date.now();
  }

  next();
});

// Methods
approvalGateSchema.methods.addChecklistItem = function(item, description, required = true, category = 'functional') {
  this.checklist.push({
    item,
    description,
    required,
    checked: false,
    category
  });
};

approvalGateSchema.methods.checkItem = function(itemIndex, checkedBy, notes = '') {
  if (this.checklist[itemIndex]) {
    this.checklist[itemIndex].checked = true;
    this.checklist[itemIndex].checkedBy = checkedBy;
    this.checklist[itemIndex].checkedAt = new Date();
    this.checklist[itemIndex].notes = notes;
  }
};

approvalGateSchema.methods.addApprover = function(role, userId, name, email, required = true) {
  this.approvers.push({
    role,
    userId,
    name,
    email,
    required,
    approved: false,
    decision: 'pending'
  });
};

approvalGateSchema.methods.recordApproval = function(userId, decision, comments = '') {
  const approver = this.approvers.find(a => a.userId === userId);
  if (approver) {
    approver.approved = (decision === 'approved');
    approver.approvedAt = new Date();
    approver.decision = decision;
    approver.comments = comments;

    // Calculate review duration
    if (this.reviewStartedAt) {
      const duration = Date.now() - this.reviewStartedAt.getTime();
      approver.reviewDuration = Math.round(duration / (1000 * 60)); // Minutes
    }
  }

  // Update gate status based on decision
  if (decision === 'rejected') {
    this.status = 'rejected';
    this.decision.finalDecision = 'rejected';
    this.decision.decidedBy = userId;
    this.decision.decidedAt = new Date();
    this.reviewCompletedAt = new Date();
  } else if (decision === 'revision-required') {
    this.status = 'revision-required';
    this.decision.finalDecision = 'revision-required';
    this.decision.decidedBy = userId;
    this.decision.decidedAt = new Date();
  }
};

approvalGateSchema.methods.addComment = function(author, role, comment, type = 'info') {
  this.comments.push({
    author,
    role,
    comment,
    type,
    createdAt: new Date(),
    resolved: false
  });
};

approvalGateSchema.methods.resolveComment = function(commentIndex, resolvedBy) {
  if (this.comments[commentIndex]) {
    this.comments[commentIndex].resolved = true;
    this.comments[commentIndex].resolvedBy = resolvedBy;
    this.comments[commentIndex].resolvedAt = new Date();
  }
};

approvalGateSchema.methods.startReview = function() {
  this.status = 'in-review';
  this.reviewStartedAt = new Date();
};

approvalGateSchema.methods.bypass = function(bypassedBy, reason) {
  if (this.metadata.bypassable) {
    this.status = 'bypassed';
    this.metadata.bypassedBy = bypassedBy;
    this.metadata.bypassReason = reason;
    this.metadata.bypassedAt = new Date();
  } else {
    throw new Error('This gate cannot be bypassed');
  }
};

approvalGateSchema.methods.escalate = function(escalatedTo) {
  this.sla.escalatedAt = new Date();
  this.sla.escalatedTo = escalatedTo;
  this.metadata.priority = 'critical';
};

approvalGateSchema.methods.checkChecklistCompletion = function() {
  const requiredItems = this.checklist.filter(item => item.required);
  const checkedItems = requiredItems.filter(item => item.checked);

  const completionPercentage = (checkedItems.length / requiredItems.length) * 100;

  return {
    completed: completionPercentage >= this.criteria.minChecklistPercentage,
    percentage: Math.round(completionPercentage),
    checkedCount: checkedItems.length,
    requiredCount: requiredItems.length
  };
};

approvalGateSchema.methods.canAutoApprove = function() {
  if (!this.criteria.allowAutoApproval) return false;

  // Check if all auto-checks passed
  if (!this.automation.autoChecksPassed) return false;

  // Check checklist completion
  const checklistStatus = this.checkChecklistCompletion();
  if (!checklistStatus.completed) return false;

  // Check AI confidence
  if (this.automation.confidence < 90) return false;

  return true;
};

approvalGateSchema.methods.autoApprove = function() {
  if (this.canAutoApprove()) {
    this.status = 'approved';
    this.decision.finalDecision = 'approved';
    this.decision.decidedBy = 'system-auto-approval';
    this.decision.decidedAt = new Date();
    this.decision.reasoning = 'Automatically approved based on criteria';
    this.reviewCompletedAt = new Date();
    return true;
  }
  return false;
};

// Statics
approvalGateSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ 'sla.dueDate': 1, 'metadata.priority': -1 });
};

approvalGateSchema.statics.findByEntity = function(entityType, entityId) {
  return this.find({
    'entity.type': entityType,
    'entity.entityId': entityId
  }).sort({ createdAt: 1 });
};

approvalGateSchema.statics.findByApprover = function(userId) {
  return this.find({
    'approvers.userId': userId,
    'approvers.approved': false,
    status: { $in: ['pending', 'in-review'] }
  }).sort({ 'sla.dueDate': 1 });
};

approvalGateSchema.statics.findOverdue = function() {
  return this.find({
    status: { $in: ['pending', 'in-review'] },
    'sla.dueDate': { $lt: new Date() }
  }).sort({ 'sla.dueDate': 1 });
};

approvalGateSchema.statics.findPendingGates = function() {
  return this.find({
    status: { $in: ['pending', 'in-review'] }
  }).sort({ 'metadata.priority': -1, 'sla.dueDate': 1 });
};

approvalGateSchema.statics.getGateSummary = async function() {
  const summary = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgReviewTime: { $avg: '$sla.actualReviewTime' }
      }
    }
  ]);

  return summary;
};

export const ApprovalGate = mongoose.model('ApprovalGate', approvalGateSchema);
export default ApprovalGate;
