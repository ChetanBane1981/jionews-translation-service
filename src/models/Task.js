import mongoose from 'mongoose';

/**
 * Task Model - Development task (decomposed from user story)
 * Used by MasterAgent, DeveloperAgent, TestingAgent
 */

const taskSchema = new mongoose.Schema({
  // Basic Information
  taskId: {
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

  // Parent Story
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserStory',
    required: true,
    index: true
  },
  storyTitle: String,

  // Task Type
  type: {
    type: String,
    enum: [
      'frontend',
      'backend',
      'database',
      'api',
      'testing',
      'documentation',
      'devops',
      'design',
      'research',
      'bugfix',
      'refactor'
    ],
    required: true
  },

  // Technical Details
  technical: {
    files: [String],              // Files to be modified/created
    dependencies: [String],       // NPM packages or internal dependencies
    apiEndpoints: [String],       // API endpoints to create/modify
    databaseChanges: [String],    // Schema changes, migrations
    environmentVars: [String],    // New env vars needed
    codeStandards: [String]       // Standards to follow
  },

  // Implementation Details
  implementation: {
    approach: String,             // How to implement
    pseudocode: String,           // Pseudocode or algorithm
    codeSnippets: [String],       // Reference code
    references: [String],         // Documentation links
    estimatedLOC: Number          // Lines of code estimate
  },

  // Sub-tasks (for complex tasks)
  subtasks: [{
    subtaskId: String,
    title: String,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'blocked'],
      default: 'pending'
    },
    completedAt: Date
  }],

  // Assignment
  assignedTo: {
    agent: {
      type: String,
      enum: ['developer-agent-1', 'developer-agent-2', 'developer-agent-3', 'human-developer'],
      required: true
    },
    assignedAt: Date,
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    }
  },

  // Status & Progress
  status: {
    type: String,
    enum: [
      'pending',            // Waiting to start
      'assigned',           // Assigned to agent
      'in-progress',        // Agent working
      'code-review',        // Awaiting review
      'revision',           // Needs changes
      'testing',            // In testing phase
      'blocked',            // Blocked by dependency
      'completed',          // Done
      'failed'              // Failed (needs escalation)
    ],
    default: 'pending',
    index: true
  },

  progress: {
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    completedSubtasks: { type: Number, default: 0 },
    totalSubtasks: { type: Number, default: 0 },
    lastUpdated: Date
  },

  // Iterations
  iterations: [{
    iterationNumber: Number,
    startedAt: Date,
    completedAt: Date,
    changes: [String],
    reason: String,
    codeGenerated: String,        // Code generated in this iteration
    feedback: String,             // Feedback from testing/review
    outcome: {
      type: String,
      enum: ['success', 'needs-revision', 'failed']
    }
  }],

  // Code Output
  code: {
    language: String,             // JavaScript, Python, etc.
    filePath: String,             // Where to save
    content: String,              // Generated code
    diff: String,                 // Diff if modifying existing file
    linesAdded: Number,
    linesRemoved: Number,
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      default: 'medium'
    }
  },

  // Testing
  testing: {
    testCaseIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase'
    }],
    testsPassed: { type: Number, default: 0 },
    testsFailed: { type: Number, default: 0 },
    testCoverage: { type: Number, min: 0, max: 100 },
    lastTestRun: Date
  },

  // Dependencies
  dependencies: [{
    taskId: String,
    type: {
      type: String,
      enum: ['blocks', 'blocked-by', 'related-to'],
      default: 'blocked-by'
    },
    resolved: { type: Boolean, default: false }
  }],

  // Blockers
  blockers: [{
    description: String,
    type: {
      type: String,
      enum: ['technical', 'dependency', 'resource', 'clarification-needed'],
    },
    reportedAt: Date,
    resolvedAt: Date,
    resolved: { type: Boolean, default: false }
  }],

  // Quality Metrics
  quality: {
    codeQuality: {
      score: { type: Number, min: 0, max: 100 },
      issues: [String],
      lintErrors: Number,
      securityVulnerabilities: Number
    },
    reviewComments: [{
      reviewer: String,
      comment: String,
      severity: {
        type: String,
        enum: ['critical', 'major', 'minor', 'suggestion']
      },
      createdAt: Date,
      resolved: { type: Boolean, default: false }
    }]
  },

  // Effort Tracking
  effort: {
    estimatedHours: Number,
    actualHours: Number,
    startedAt: Date,
    completedAt: Date,
    pausedDuration: Number        // Time spent blocked/paused
  },

  // Human Gate Checkpoints
  checkpoints: [{
    checkpoint: String,
    required: Boolean,
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending'
    },
    checkedBy: String,
    checkedAt: Date,
    notes: String
  }],

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

  // Metadata
  metadata: {
    createdBy: String,            // master-agent, human
    automationLevel: {
      type: String,
      enum: ['fully-automated', 'semi-automated', 'manual'],
      default: 'fully-automated'
    },
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex', 'very-complex']
    }
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ status: 1, 'assignedTo.priority': -1 });
taskSchema.index({ 'assignedTo.agent': 1, status: 1 });
taskSchema.index({ storyId: 1 });

// Pre-save middleware
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Update progress percentage
  if (this.subtasks && this.subtasks.length > 0) {
    const completed = this.subtasks.filter(st => st.status === 'completed').length;
    this.progress.completedSubtasks = completed;
    this.progress.totalSubtasks = this.subtasks.length;
    this.progress.percentage = Math.round((completed / this.subtasks.length) * 100);
    this.progress.lastUpdated = Date.now();
  }

  // Calculate actual hours if completed
  if (this.status === 'completed' && this.effort.startedAt && !this.effort.actualHours) {
    const duration = Date.now() - this.effort.startedAt.getTime();
    this.effort.actualHours = Math.round(duration / (1000 * 60 * 60) * 10) / 10; // Hours with 1 decimal
    this.effort.completedAt = Date.now();
    this.completedAt = Date.now();
  }

  next();
});

// Methods
taskSchema.methods.addIteration = function(changes, reason) {
  this.iterations.push({
    iterationNumber: this.iterations.length + 1,
    startedAt: new Date(),
    changes,
    reason
  });
};

taskSchema.methods.completeIteration = function(outcome, codeGenerated, feedback) {
  const lastIteration = this.iterations[this.iterations.length - 1];
  if (lastIteration) {
    lastIteration.completedAt = new Date();
    lastIteration.outcome = outcome;
    lastIteration.codeGenerated = codeGenerated;
    lastIteration.feedback = feedback;
  }
};

taskSchema.methods.addBlocker = function(description, type) {
  this.blockers.push({
    description,
    type,
    reportedAt: new Date(),
    resolved: false
  });
  this.status = 'blocked';
};

taskSchema.methods.resolveBlocker = function(blockerIndex) {
  if (this.blockers[blockerIndex]) {
    this.blockers[blockerIndex].resolved = true;
    this.blockers[blockerIndex].resolvedAt = new Date();
  }

  // If all blockers resolved, change status back
  if (this.blockers.every(b => b.resolved)) {
    this.status = 'in-progress';
  }
};

taskSchema.methods.updateProgress = function(percentage) {
  this.progress.percentage = Math.min(100, Math.max(0, percentage));
  this.progress.lastUpdated = new Date();
};

taskSchema.methods.assignToAgent = function(agentName, priority = 'medium') {
  this.assignedTo = {
    agent: agentName,
    assignedAt: new Date(),
    priority
  };
  this.status = 'assigned';
};

taskSchema.methods.startWork = function() {
  this.status = 'in-progress';
  if (!this.effort.startedAt) {
    this.effort.startedAt = new Date();
  }
};

taskSchema.methods.completeTask = function() {
  this.status = 'completed';
  this.progress.percentage = 100;
  this.completedAt = new Date();
};

// Statics
taskSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ 'assignedTo.priority': -1, createdAt: 1 });
};

taskSchema.statics.findByAgent = function(agentName) {
  return this.find({ 'assignedTo.agent': agentName, status: { $in: ['assigned', 'in-progress'] } });
};

taskSchema.statics.findByStory = function(storyId) {
  return this.find({ storyId }).sort({ 'assignedTo.priority': -1 });
};

taskSchema.statics.getBlockedTasks = function() {
  return this.find({ status: 'blocked', 'blockers.resolved': false });
};

taskSchema.statics.getPendingCheckpoints = function() {
  return this.find({
    'checkpoints': {
      $elemMatch: {
        required: true,
        status: 'pending'
      }
    }
  });
};

export const Task = mongoose.model('Task', taskSchema);
export default Task;
