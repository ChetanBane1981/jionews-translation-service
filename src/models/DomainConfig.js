import mongoose from 'mongoose';

/**
 * DomainConfig Schema - Configuration for each content domain
 * Defines how agents process content for different domains (news, ecommerce, social, etc.)
 */
const domainConfigSchema = new mongoose.Schema({
  // Domain Identity
  domainId: {
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
  contentType: {
    type: String,
    required: true,
    enum: ['news', 'product', 'social_post', 'document', 'video', 'image', 'custom']
  },
  enabled: {
    type: Boolean,
    default: true
  },

  // Content Categories (domain-specific)
  categories: [{
    id: String,
    name: String,
    description: String,
    icon: String
  }],

  // User Segments for Personalization
  userSegments: [{
    id: String,
    name: String,
    description: String,
    interests: [String]
  }],

  // Agent Pipeline Configuration
  agentPipeline: [{
    type: {
      type: String,
      required: true,
      enum: [
        'feed',
        'detection',
        'cluster',
        'moderation',
        'credibility',
        'summary',
        'translation',
        'ranking',
        'personalization',
        'publishing',
        'custom'
      ]
    },
    name: String,
    enabled: {
      type: Boolean,
      default: true
    },
    order: Number,
    parallelizable: {
      type: Boolean,
      default: false
    },
    config: mongoose.Schema.Types.Mixed, // Agent-specific configuration
    skills: [String], // Skills this agent should use
    retry: {
      enabled: Boolean,
      maxAttempts: Number,
      backoffMs: Number
    }
  }],

  // Content Sources Configuration
  sources: [{
    id: String,
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['rss', 'api', 'scraper', 'webhook', 'manual']
    },
    enabled: Boolean,
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    pollIntervalMinutes: Number,
    config: mongoose.Schema.Types.Mixed
  }],

  // Processing Thresholds
  thresholds: {
    // Credibility
    credibilityMin: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    credibilityAutoReject: {
      type: Number,
      default: 30,
      min: 0,
      max: 100
    },

    // Importance
    importanceMin: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    importanceHighPriority: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },

    // Auto-publishing
    autoPublishMin: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },
    requireApprovalBelow: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },

    // Clustering
    similarityThreshold: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1
    },

    // Moderation
    toxicityMax: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    }
  },

  // Translation Configuration
  translation: {
    enabled: {
      type: Boolean,
      default: true
    },
    targetLanguages: [{
      code: String, // 'hi', 'ta', 'te', 'es', 'fr', etc.
      name: String, // 'Hindi', 'Tamil', 'Telugu'
      enabled: Boolean
    }],
    provider: {
      type: String,
      enum: ['sarvam', 'anthropic', 'google', 'custom'],
      default: 'sarvam'
    },
    autoTranslate: Boolean
  },

  // AI Service Configuration
  aiServices: {
    primary: {
      provider: {
        type: String,
        enum: ['anthropic', 'openai', 'google', 'custom'],
        default: 'anthropic'
      },
      model: String,
      maxTokens: Number,
      temperature: Number
    },
    fallback: {
      provider: String,
      model: String
    }
  },

  // Branding & UI Configuration
  branding: {
    title: String,
    subtitle: String,
    logo: String,
    primaryColor: String,
    accentColor: String
  },

  // Publishing Configuration
  publishing: {
    autoPublish: {
      type: Boolean,
      default: false
    },
    scheduleEnabled: Boolean,
    moderationRequired: Boolean,
    approvalWorkflow: {
      type: String,
      enum: ['none', 'single', 'multi'],
      default: 'single'
    }
  },

  // Analytics Configuration
  analytics: {
    enabled: Boolean,
    trackMetrics: [String],
    reportingInterval: String
  },

  // Rate Limits (API calls per agent per minute)
  rateLimits: {
    feed: Number,
    detection: Number,
    credibility: Number,
    translation: Number,
    summary: Number,
    default: {
      type: Number,
      default: 60
    }
  },

  // Cache Configuration
  cache: {
    enabled: Boolean,
    ttlMinutes: Number,
    maxSize: Number
  },

  // Custom Domain Fields
  customFields: [{
    name: String,
    type: String,
    required: Boolean,
    default: mongoose.Schema.Types.Mixed,
    validation: mongoose.Schema.Types.Mixed
  }],

  // Metadata
  version: {
    type: String,
    default: '1.0.0'
  },
  createdBy: String,
  lastModifiedBy: String

}, {
  timestamps: true,
  collection: 'domain_configs'
});

// Indexes
domainConfigSchema.index({ domainId: 1, enabled: 1 });

// Methods
domainConfigSchema.methods.getEnabledAgents = function() {
  return this.agentPipeline
    .filter(agent => agent.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

domainConfigSchema.methods.getAgentConfig = function(agentType) {
  return this.agentPipeline.find(agent => agent.type === agentType);
};

domainConfigSchema.methods.getEnabledSources = function() {
  return this.sources.filter(source => source.enabled);
};

domainConfigSchema.methods.getCategoryById = function(categoryId) {
  return this.categories.find(cat => cat.id === categoryId);
};

domainConfigSchema.methods.getUserSegmentById = function(segmentId) {
  return this.userSegments.find(seg => seg.id === segmentId);
};

domainConfigSchema.methods.shouldAutoPublish = function(contentScore) {
  return this.publishing.autoPublish &&
         contentScore >= this.thresholds.autoPublishMin;
};

domainConfigSchema.methods.requiresApproval = function(contentScore) {
  return contentScore < this.thresholds.requireApprovalBelow;
};

// Statics
domainConfigSchema.statics.findEnabled = function() {
  return this.find({ enabled: true });
};

domainConfigSchema.statics.findByContentType = function(contentType) {
  return this.find({ contentType, enabled: true });
};

// Validation
domainConfigSchema.pre('save', function(next) {
  // Ensure agent pipeline has unique orders
  const orders = this.agentPipeline.map(a => a.order).filter(o => o !== undefined);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    return next(new Error('Agent pipeline must have unique order values'));
  }

  // Ensure thresholds are logical
  if (this.thresholds.autoPublishMin < this.thresholds.credibilityMin) {
    return next(new Error('autoPublishMin cannot be lower than credibilityMin'));
  }

  next();
});

const DomainConfig = mongoose.model('DomainConfig', domainConfigSchema);

export default DomainConfig;
