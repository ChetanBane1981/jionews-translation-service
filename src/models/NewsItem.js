import mongoose from 'mongoose';

/**
 * NewsItem Schema - Stores all news items through the pipeline
 */
const newsItemSchema = new mongoose.Schema({
  // Basic Info
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: 'text'
  },
  description: String,
  url: String,
  imageUrl: String,
  author: String,

  // Source Info
  sourceName: String,
  sourceUrl: String,
  sourceTrust: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },

  // Timestamps
  publishedAt: Date,
  fetchedAt: Date,
  processedAt: Date,

  // Agent Processing Results

  // Detection Agent
  breaking: Boolean,
  importanceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical']
  },
  category: {
    type: String,
    enum: ['Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'Other']
  },
  detectionReasoning: String,

  // Cluster Agent
  isDuplicate: Boolean,
  clusterId: String,
  originalId: String,

  // Moderation Agent
  moderationPassed: Boolean,
  violations: [String],

  // Credibility Agent
  credibilityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  fakeRisk: {
    type: String,
    enum: ['Low', 'Medium', 'High']
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100
  },
  credibilityReasoning: String,
  redFlags: [String],

  // Summary Agent
  summary: String,
  generatedAt: Date,

  // Translation Agent
  translations: [{
    language: String,
    title: String,
    summary: String,
    quality: Number
  }],

  // Personalization Agent
  personalizedVersions: {
    general: mongoose.Schema.Types.Mixed,
    finance: mongoose.Schema.Types.Mixed,
    politics: mongoose.Schema.Types.Mixed,
    tech: mongoose.Schema.Types.Mixed
  },
  relevanceScore: Number,

  // Publishing
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  autoPublished: Boolean,

  // Human Approval
  requiresApproval: Boolean,
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalReason: String,
  approvedBy: String,
  approvedAt: Date,

  // Pipeline Status
  pipelineStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  currentStage: String,
  failedAt: String,
  errorMessage: String,

  // Metadata
  metadata: mongoose.Schema.Types.Mixed

}, {
  timestamps: true,
  collection: 'news_items'
});

// Indexes for performance
newsItemSchema.index({ publishedAt: -1 });
newsItemSchema.index({ breaking: 1, importanceScore: -1 });
newsItemSchema.index({ category: 1, publishedAt: -1 });
newsItemSchema.index({ published: 1, publishedAt: -1 });
newsItemSchema.index({ requiresApproval: 1, approvalStatus: 1 });
newsItemSchema.index({ credibilityScore: 1 });
newsItemSchema.index({ pipelineStatus: 1 });

// Virtual for full article (if needed)
newsItemSchema.virtual('fullArticle').get(function() {
  return this.summary || this.description;
});

// Methods
newsItemSchema.methods.markAsPublished = function() {
  this.published = true;
  this.publishedAt = new Date();
  this.pipelineStatus = 'completed';
  return this.save();
};

newsItemSchema.methods.approve = function(approver) {
  this.approvalStatus = 'approved';
  this.approvedBy = approver;
  this.approvedAt = new Date();
  return this.save();
};

newsItemSchema.methods.reject = function(approver, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = approver;
  this.approvedAt = new Date();
  this.approvalReason = reason;
  return this.save();
};

// Statics
newsItemSchema.statics.findBreakingNews = function() {
  return this.find({ breaking: true, published: true })
    .sort({ importanceScore: -1, publishedAt: -1 })
    .limit(10);
};

newsItemSchema.statics.findPendingApproval = function() {
  return this.find({
    requiresApproval: true,
    approvalStatus: 'pending'
  }).sort({ importanceScore: -1 });
};

newsItemSchema.statics.findByCategory = function(category) {
  return this.find({ category, published: true })
    .sort({ publishedAt: -1 });
};

const NewsItem = mongoose.model('NewsItem', newsItemSchema);

export default NewsItem;
