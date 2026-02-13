import mongoose from 'mongoose';

/**
 * ContentItem Schema - Generic content model for multi-domain support
 * Supports: news, products, social posts, documents, and any custom content type
 */
const contentItemSchema = new mongoose.Schema({
  // Core Identity
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['news', 'product', 'social_post', 'document', 'video', 'image', 'custom'],
    index: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },

  // Generic Content Fields (works for all domains)
  title: {
    type: String,
    required: true,
    index: 'text'
  },
  content: String, // Main content (article body, product description, post text, etc.)
  description: String, // Short summary/excerpt
  url: String,
  imageUrl: String,
  author: String, // Creator, seller, poster, etc.

  // Source Information (generic)
  sourceName: String,
  sourceUrl: String,
  sourceTrust: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },

  // Generic Timestamps
  publishedAt: Date, // Original publish/create date
  fetchedAt: Date, // When we ingested it
  processedAt: Date, // When pipeline completed
  lastModifiedAt: Date, // Last update

  // Domain-Specific Metadata (flexible object per domain)
  domainMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // For news: { category, breaking, urgency }
    // For ecommerce: { price, currency, inventory, brand, sku }
    // For social: { platform, likes, shares, comments, hashtags }
  },

  // Generic Processing Results (from all agents)
  processingResults: {
    // Detection/Classification
    classification: {
      category: String,
      subcategories: [String],
      tags: [String],
      confidence: Number
    },

    // Importance/Ranking
    importance: {
      score: { type: Number, min: 0, max: 100 },
      level: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
      reasoning: String
    },

    // Clustering/Deduplication
    clustering: {
      isDuplicate: Boolean,
      clusterId: String,
      originalId: String,
      similarityScore: Number
    },

    // Content Moderation
    moderation: {
      passed: Boolean,
      violations: [String],
      toxicityScore: Number,
      adultContent: Boolean,
      spam: Boolean
    },

    // Credibility/Trust
    credibility: {
      score: { type: Number, min: 0, max: 100 },
      risk: { type: String, enum: ['Low', 'Medium', 'High'] },
      reasoning: String,
      redFlags: [String],
      verified: Boolean
    },

    // AI-Generated Summary
    summary: {
      text: String,
      generatedAt: Date,
      model: String,
      keyPoints: [String]
    },

    // Translation (multi-language)
    translations: [{
      language: String,
      title: String,
      content: String,
      summary: String,
      quality: Number,
      generatedAt: Date
    }],

    // Sentiment & Emotion
    sentiment: {
      score: { type: Number, min: -100, max: 100 }, // -100 (negative) to +100 (positive)
      emotion: { type: String, enum: ['joy', 'anger', 'fear', 'surprise', 'sadness', 'neutral'] },
      tone: { type: String, enum: ['formal', 'casual', 'urgent', 'promotional', 'informative'] }
    },

    // Entity Extraction
    entities: {
      people: [String],
      places: [String],
      organizations: [String],
      topics: [String],
      keywords: [String]
    },

    // Personalization
    personalization: {
      versions: mongoose.Schema.Types.Mixed, // Different versions per user segment
      relevanceScore: Number,
      targetSegments: [String]
    },

    // Domain-specific agent results
    customResults: mongoose.Schema.Types.Mixed
  },

  // Publication Status
  published: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: Date,
  autoPublished: Boolean,

  // Human-in-the-Loop
  requiresApproval: {
    type: Boolean,
    default: false,
    index: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approvalReason: String,
  approvedBy: String,
  approvedAt: Date,

  // Pipeline Status
  pipelineStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  currentStage: String,
  completedStages: [String],
  failedAt: String,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },

  // Performance Metrics
  metrics: {
    processingTime: Number, // milliseconds
    apiCalls: Number,
    costEstimate: Number, // USD
    cacheHits: Number
  },

  // Generic Metadata
  metadata: mongoose.Schema.Types.Mixed

}, {
  timestamps: true,
  collection: 'content_items' // Separate collection for generic content
});

// Indexes for performance (generic across domains)
contentItemSchema.index({ type: 1, domain: 1 });
contentItemSchema.index({ publishedAt: -1 });
contentItemSchema.index({ 'processingResults.importance.score': -1 });
contentItemSchema.index({ published: 1, publishedAt: -1 });
contentItemSchema.index({ requiresApproval: 1, approvalStatus: 1 });
contentItemSchema.index({ 'processingResults.credibility.score': 1 });
contentItemSchema.index({ pipelineStatus: 1, domain: 1 });
contentItemSchema.index({ 'domainMetadata.category': 1 }); // Domain-specific indexing

// Virtual for full content
contentItemSchema.virtual('fullContent').get(function() {
  return this.content || this.processingResults?.summary?.text || this.description;
});

// Methods - Generic actions
contentItemSchema.methods.markAsPublished = function() {
  this.published = true;
  this.publishedAt = new Date();
  this.pipelineStatus = 'completed';
  return this.save();
};

contentItemSchema.methods.approve = function(approver) {
  this.approvalStatus = 'approved';
  this.approvedBy = approver;
  this.approvedAt = new Date();
  return this.save();
};

contentItemSchema.methods.reject = function(approver, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = approver;
  this.approvedAt = new Date();
  this.approvalReason = reason;
  return this.save();
};

contentItemSchema.methods.updateProcessingResult = function(agentName, result) {
  if (!this.processingResults) {
    this.processingResults = {};
  }
  this.processingResults[agentName] = result;
  this.markModified('processingResults');
  return this.save();
};

contentItemSchema.methods.addToStage = function(stage) {
  if (!this.completedStages.includes(stage)) {
    this.completedStages.push(stage);
  }
  this.currentStage = stage;
  return this.save();
};

// Statics - Generic queries
contentItemSchema.statics.findByDomain = function(domain, filters = {}) {
  return this.find({ domain, ...filters })
    .sort({ publishedAt: -1 });
};

contentItemSchema.statics.findHighImportance = function(domain, minScore = 80) {
  return this.find({
    domain,
    'processingResults.importance.score': { $gte: minScore },
    published: true
  })
    .sort({ 'processingResults.importance.score': -1, publishedAt: -1 })
    .limit(10);
};

contentItemSchema.statics.findPendingApproval = function(domain = null) {
  const query = {
    requiresApproval: true,
    approvalStatus: 'pending'
  };
  if (domain) query.domain = domain;

  return this.find(query)
    .sort({ 'processingResults.importance.score': -1 });
};

contentItemSchema.statics.findByCategory = function(domain, category) {
  return this.find({
    domain,
    'domainMetadata.category': category,
    published: true
  })
    .sort({ publishedAt: -1 });
};

contentItemSchema.statics.findDuplicates = function(contentId) {
  return this.find({
    'processingResults.clustering.originalId': contentId
  });
};

// Backward compatibility helper - convert NewsItem to ContentItem
contentItemSchema.statics.fromNewsItem = function(newsItem) {
  return {
    id: newsItem.id,
    type: 'news',
    domain: 'news',
    title: newsItem.title,
    content: newsItem.description,
    description: newsItem.description,
    url: newsItem.url,
    imageUrl: newsItem.imageUrl,
    author: newsItem.author,
    sourceName: newsItem.sourceName,
    sourceUrl: newsItem.sourceUrl,
    sourceTrust: newsItem.sourceTrust,
    publishedAt: newsItem.publishedAt,
    fetchedAt: newsItem.fetchedAt,
    processedAt: newsItem.processedAt,

    domainMetadata: {
      category: newsItem.category,
      breaking: newsItem.breaking,
      urgency: newsItem.urgency
    },

    processingResults: {
      classification: {
        category: newsItem.category,
        confidence: newsItem.importanceScore
      },
      importance: {
        score: newsItem.importanceScore,
        level: newsItem.urgency,
        reasoning: newsItem.detectionReasoning
      },
      clustering: {
        isDuplicate: newsItem.isDuplicate,
        clusterId: newsItem.clusterId,
        originalId: newsItem.originalId
      },
      moderation: {
        passed: newsItem.moderationPassed,
        violations: newsItem.violations || []
      },
      credibility: {
        score: newsItem.credibilityScore,
        risk: newsItem.fakeRisk,
        reasoning: newsItem.credibilityReasoning,
        redFlags: newsItem.redFlags || []
      },
      summary: {
        text: newsItem.summary,
        generatedAt: newsItem.generatedAt
      },
      translations: newsItem.translations || [],
      personalization: {
        versions: newsItem.personalizedVersions,
        relevanceScore: newsItem.relevanceScore
      }
    },

    published: newsItem.published,
    autoPublished: newsItem.autoPublished,
    requiresApproval: newsItem.requiresApproval,
    approvalStatus: newsItem.approvalStatus,
    approvalReason: newsItem.approvalReason,
    approvedBy: newsItem.approvedBy,
    approvedAt: newsItem.approvedAt,
    pipelineStatus: newsItem.pipelineStatus,
    currentStage: newsItem.currentStage,
    failedAt: newsItem.failedAt,
    errorMessage: newsItem.errorMessage,
    metadata: newsItem.metadata
  };
};

const ContentItem = mongoose.model('ContentItem', contentItemSchema);

export default ContentItem;
