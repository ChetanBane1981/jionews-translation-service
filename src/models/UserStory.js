import mongoose from 'mongoose';

/**
 * UserStory Model - Software development user story
 * Used by ProductManagerAgent, ProjectManagerAgent
 */

const userStorySchema = new mongoose.Schema({
  // Basic Information
  storyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true
  },

  // Requirements
  requirements: [{
    type: {
      type: String,
      enum: ['functional', 'non-functional', 'technical', 'business'],
      required: true
    },
    description: String,
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    },
    source: String // PM, stakeholder, research
  }],

  // Acceptance Criteria
  acceptanceCriteria: [{
    criterion: String,
    testable: { type: Boolean, default: true },
    priority: {
      type: String,
      enum: ['must-have', 'should-have', 'nice-to-have'],
      default: 'must-have'
    }
  }],

  // User Story Format
  asA: String,        // "As a [user type]"
  iWant: String,      // "I want [functionality]"
  soThat: String,     // "So that [business value]"

  // Metadata
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  estimatedEffort: {
    storyPoints: { type: Number, min: 0, max: 100 },
    hours: { type: Number, min: 0 },
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex', 'very-complex'],
      default: 'medium'
    }
  },

  // Dependencies
  dependencies: [{
    storyId: String,
    type: {
      type: String,
      enum: ['blocks', 'blocked-by', 'related-to', 'duplicate-of'],
      default: 'related-to'
    },
    description: String
  }],

  // Research & Analysis
  research: {
    completed: { type: Boolean, default: false },
    findings: [String],
    technicalFeasibility: {
      score: { type: Number, min: 0, max: 100 },
      risks: [String],
      recommendations: [String]
    },
    competitorAnalysis: [String],
    userFeedback: [String]
  },

  // Status & Workflow
  status: {
    type: String,
    enum: [
      'draft',              // Initial creation
      'research',           // Research in progress
      'ready-for-review',   // Research complete, awaiting PM review
      'approved',           // PM approved, ready for planning
      'rejected',           // PM rejected, needs iteration
      'in-planning',        // Master agent decomposing
      'in-progress',        // Sub-agents working
      'in-testing',         // Testing phase
      'done',               // Complete and approved
      'cancelled'           // Cancelled
    ],
    default: 'draft'
  },

  // Approval Gates
  approvals: [{
    gate: {
      type: String,
      enum: ['pm-review', 'pm-approval', 'technical-review', 'final-walkthrough', 'production-ready'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision-required'],
      default: 'pending'
    },
    approver: String,
    approvedAt: Date,
    comments: String,
    checklist: [{
      item: String,
      checked: Boolean,
      requiredBy: String
    }]
  }],

  // Iteration History
  iterations: [{
    iterationNumber: Number,
    startedAt: Date,
    completedAt: Date,
    changes: [String],
    reason: String,
    outcome: {
      type: String,
      enum: ['approved', 'needs-more-work', 'rejected'],
    }
  }],

  // Tasks (decomposed by Master Agent)
  tasks: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    title: String,
    status: String,
    assignedTo: String
  }],

  // Test Cases (created by Planning Agent)
  testCases: [{
    testCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' },
    title: String,
    status: String
  }],

  // Constitution (rules and constraints)
  constitution: {
    rules: [String],
    constraints: [String],
    guidelines: [String],
    codeStandards: [String],
    securityRequirements: [String]
  },

  // Sprint Assignment
  sprint: {
    sprintId: String,
    sprintName: String,
    startDate: Date,
    endDate: Date
  },

  // Tracking
  createdBy: {
    type: String,
    enum: ['human', 'product-manager-agent'],
    default: 'product-manager-agent'
  },
  assignedTo: {
    agent: String,
    assignedAt: Date
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
  completedAt: Date,

  // Analytics
  metrics: {
    timeInResearch: Number,      // Minutes
    timeInDevelopment: Number,   // Minutes
    timeInTesting: Number,       // Minutes
    totalIterations: { type: Number, default: 0 },
    humanInterventions: { type: Number, default: 0 },
    automationRate: { type: Number, min: 0, max: 100 } // % automated
  }
}, {
  timestamps: true
});

// Indexes
userStorySchema.index({ status: 1, priority: -1 });
userStorySchema.index({ 'sprint.sprintId': 1 });
userStorySchema.index({ createdAt: -1 });

// Pre-save middleware
userStorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate automation rate
  if (this.metrics) {
    const totalInterventions = this.metrics.humanInterventions || 0;
    const totalIterations = this.metrics.totalIterations || 1;
    this.metrics.automationRate = Math.round(((totalIterations - totalInterventions) / totalIterations) * 100);
  }

  next();
});

// Methods
userStorySchema.methods.addIteration = function(changes, reason) {
  this.iterations.push({
    iterationNumber: this.iterations.length + 1,
    startedAt: new Date(),
    changes,
    reason
  });
  this.metrics.totalIterations = this.iterations.length;
};

userStorySchema.methods.completeIteration = function(outcome) {
  const lastIteration = this.iterations[this.iterations.length - 1];
  if (lastIteration) {
    lastIteration.completedAt = new Date();
    lastIteration.outcome = outcome;
  }
};

userStorySchema.methods.addApprovalGate = function(gate, requiredChecklist = []) {
  this.approvals.push({
    gate,
    status: 'pending',
    checklist: requiredChecklist.map(item => ({
      item,
      checked: false
    }))
  });
};

userStorySchema.methods.updateApprovalGate = function(gate, status, approver, comments) {
  const approval = this.approvals.find(a => a.gate === gate);
  if (approval) {
    approval.status = status;
    approval.approver = approver;
    approval.approvedAt = new Date();
    approval.comments = comments;
  }
};

userStorySchema.methods.isApproved = function(gate) {
  const approval = this.approvals.find(a => a.gate === gate);
  return approval && approval.status === 'approved';
};

userStorySchema.methods.needsHumanIntervention = function() {
  // Check if any approval is rejected or needs revision
  return this.approvals.some(a => ['rejected', 'revision-required'].includes(a.status));
};

// Statics
userStorySchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ priority: -1, createdAt: -1 });
};

userStorySchema.statics.findBySprint = function(sprintId) {
  return this.find({ 'sprint.sprintId': sprintId }).sort({ priority: -1 });
};

userStorySchema.statics.getPendingApprovals = function() {
  return this.find({
    'approvals': {
      $elemMatch: {
        status: { $in: ['pending', 'revision-required'] }
      }
    }
  }).sort({ priority: -1, createdAt: 1 });
};

export const UserStory = mongoose.model('UserStory', userStorySchema);
export default UserStory;
