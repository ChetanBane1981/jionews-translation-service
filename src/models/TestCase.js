import mongoose from 'mongoose';

/**
 * TestCase Model - Test case for software development
 * Used by PlanningAgent, TestingAgent
 */

const testCaseSchema = new mongoose.Schema({
  // Basic Information
  testCaseId: {
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

  // Parent References
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserStory',
    required: true,
    index: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },

  // Test Type
  type: {
    type: String,
    enum: [
      'unit',              // Unit test
      'integration',       // Integration test
      'e2e',              // End-to-end test
      'performance',      // Performance test
      'security',         // Security test
      'accessibility',    // Accessibility test
      'regression',       // Regression test
      'smoke',            // Smoke test
      'acceptance'        // User acceptance test
    ],
    required: true
  },

  // Priority
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },

  // Test Steps
  steps: [{
    stepNumber: Number,
    action: String,
    expectedResult: String,
    actualResult: String,
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'skipped', 'blocked'],
      default: 'pending'
    }
  }],

  // Preconditions
  preconditions: [String],

  // Test Data
  testData: {
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: mongoose.Schema.Types.Mixed,
    actualOutput: mongoose.Schema.Types.Mixed,
    fixtures: [String],        // Test fixture files
    mocks: [String]            // Mock data/services needed
  },

  // Automated Test Code
  automation: {
    automated: { type: Boolean, default: false },
    framework: {
      type: String,
      enum: ['jest', 'mocha', 'cypress', 'playwright', 'selenium', 'pytest', 'junit', 'manual'],
      default: 'jest'
    },
    testFile: String,          // Path to test file
    testCode: String,          // Generated test code
    command: String,           // Command to run test
    timeout: Number            // Test timeout in ms
  },

  // Execution History
  executions: [{
    executionNumber: Number,
    executedAt: Date,
    executedBy: {
      type: String,
      enum: ['testing-agent', 'human-tester', 'ci-pipeline']
    },
    duration: Number,          // Execution time in ms
    status: {
      type: String,
      enum: ['passed', 'failed', 'error', 'skipped'],
      required: true
    },
    errorMessage: String,
    stackTrace: String,
    screenshots: [String],     // Screenshot URLs (for UI tests)
    logs: String,
    environment: {
      os: String,
      browser: String,
      version: String
    }
  }],

  // Current Status
  status: {
    type: String,
    enum: [
      'draft',             // Test case created, not ready
      'ready',             // Ready to execute
      'in-progress',       // Execution in progress
      'passed',            // Last execution passed
      'failed',            // Last execution failed
      'blocked',           // Blocked by dependency
      'obsolete'           // No longer relevant
    ],
    default: 'draft',
    index: true
  },

  // Pass Matrix Configuration
  passMatrix: {
    requiredPasses: { type: Number, default: 1 },      // How many consecutive passes needed
    consecutivePasses: { type: Number, default: 0 },   // Current consecutive passes
    failureThreshold: { type: Number, default: 3 },    // Max failures before escalation
    currentFailures: { type: Number, default: 0 },
    passRate: { type: Number, min: 0, max: 100 },      // % pass rate
    stability: {
      type: String,
      enum: ['stable', 'flaky', 'unstable'],
      default: 'stable'
    }
  },

  // Coverage
  coverage: {
    lines: { type: Number, min: 0, max: 100 },
    branches: { type: Number, min: 0, max: 100 },
    functions: { type: Number, min: 0, max: 100 },
    statements: { type: Number, min: 0, max: 100 }
  },

  // Dependencies
  dependencies: [{
    testCaseId: String,
    type: {
      type: String,
      enum: ['requires', 'setup-for', 'cleanup-for'],
      default: 'requires'
    }
  }],

  // Tags
  tags: [String],              // 'regression', 'critical-path', 'smoke', etc.

  // Linked Requirements
  requirements: [{
    requirementId: String,
    description: String,
    verified: { type: Boolean, default: false }
  }],

  // Approval
  approval: {
    required: { type: Boolean, default: false },
    approvedBy: String,
    approvedAt: Date,
    comments: String
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
  lastExecuted: Date,

  // Metadata
  metadata: {
    createdBy: {
      type: String,
      enum: ['planning-agent', 'testing-agent', 'human-tester'],
      default: 'planning-agent'
    },
    estimatedDuration: Number,  // Expected execution time in ms
    actualDuration: Number,     // Average execution time
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex']
    }
  }
}, {
  timestamps: true
});

// Indexes
testCaseSchema.index({ status: 1, priority: -1 });
testCaseSchema.index({ type: 1, status: 1 });
testCaseSchema.index({ storyId: 1, status: 1 });
testCaseSchema.index({ 'automation.automated': 1 });

// Pre-save middleware
testCaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate pass rate
  if (this.executions && this.executions.length > 0) {
    const totalExecutions = this.executions.length;
    const passedExecutions = this.executions.filter(e => e.status === 'passed').length;
    this.passMatrix.passRate = Math.round((passedExecutions / totalExecutions) * 100);

    // Determine stability
    const recentExecutions = this.executions.slice(-10);
    const recentPassRate = recentExecutions.filter(e => e.status === 'passed').length / recentExecutions.length;
    if (recentPassRate >= 0.9) {
      this.passMatrix.stability = 'stable';
    } else if (recentPassRate >= 0.6) {
      this.passMatrix.stability = 'flaky';
    } else {
      this.passMatrix.stability = 'unstable';
    }

    // Update last executed
    this.lastExecuted = this.executions[this.executions.length - 1].executedAt;

    // Calculate average duration
    const durationsWithValues = this.executions
      .filter(e => e.duration > 0)
      .map(e => e.duration);
    if (durationsWithValues.length > 0) {
      this.metadata.actualDuration = Math.round(
        durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length
      );
    }
  }

  next();
});

// Methods
testCaseSchema.methods.addExecution = function(status, executedBy, duration, errorMessage = null) {
  const execution = {
    executionNumber: this.executions.length + 1,
    executedAt: new Date(),
    executedBy,
    duration,
    status,
    errorMessage
  };

  this.executions.push(execution);

  // Update consecutive passes/failures
  if (status === 'passed') {
    this.passMatrix.consecutivePasses += 1;
    this.passMatrix.currentFailures = 0;
    this.status = 'passed';

    // Check if pass matrix satisfied
    if (this.passMatrix.consecutivePasses >= this.passMatrix.requiredPasses) {
      this.approval.required = false; // Auto-approve after sufficient passes
    }
  } else if (status === 'failed') {
    this.passMatrix.consecutivePasses = 0;
    this.passMatrix.currentFailures += 1;
    this.status = 'failed';

    // Check if failure threshold exceeded
    if (this.passMatrix.currentFailures >= this.passMatrix.failureThreshold) {
      // Needs human intervention
      this.approval.required = true;
    }
  }

  return execution;
};

testCaseSchema.methods.resetPassMatrix = function() {
  this.passMatrix.consecutivePasses = 0;
  this.passMatrix.currentFailures = 0;
};

testCaseSchema.methods.approve = function(approver, comments) {
  this.approval.approvedBy = approver;
  this.approval.approvedAt = new Date();
  this.approval.comments = comments;
  this.approval.required = false;
};

testCaseSchema.methods.generateTestCode = function(framework) {
  // This would be implemented by testing-agent
  // Placeholder for code generation
  this.automation.automated = true;
  this.automation.framework = framework;
  this.status = 'ready';
};

testCaseSchema.methods.markObsolete = function(reason) {
  this.status = 'obsolete';
  this.metadata.obsoleteReason = reason;
};

// Statics
testCaseSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ priority: -1, createdAt: 1 });
};

testCaseSchema.statics.findByStory = function(storyId) {
  return this.find({ storyId }).sort({ type: 1, priority: -1 });
};

testCaseSchema.statics.findByType = function(type) {
  return this.find({ type, status: { $ne: 'obsolete' } });
};

testCaseSchema.statics.findAutomated = function() {
  return this.find({ 'automation.automated': true, status: { $ne: 'obsolete' } });
};

testCaseSchema.statics.findFlakyTests = function() {
  return this.find({ 'passMatrix.stability': 'flaky' });
};

testCaseSchema.statics.findFailedTests = function() {
  return this.find({
    status: 'failed',
    'passMatrix.currentFailures': { $gte: 1 }
  }).sort({ 'passMatrix.currentFailures': -1 });
};

testCaseSchema.statics.findPendingApproval = function() {
  return this.find({
    'approval.required': true,
    'approval.approvedAt': null
  });
};

testCaseSchema.statics.getTestSummary = async function(storyId = null) {
  const filter = storyId ? { storyId } : {};

  const summary = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$metadata.actualDuration' }
      }
    }
  ]);

  return summary;
};

export const TestCase = mongoose.model('TestCase', testCaseSchema);
export default TestCase;
