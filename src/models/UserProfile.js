import mongoose from 'mongoose';

/**
 * UserProfile Schema - User preferences and personalization data
 */
const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User Info
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },

  // Preferences
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  preferredLanguages: [String],

  // Multi-Domain Preferences (generic across all domains)
  domainPreferences: [{
    domain: {
      type: String,
      required: true
    },
    interests: [String], // Domain-specific categories
    userSegment: String, // e.g., 'general', 'finance', 'tech' for news; 'fashion', 'electronics' for ecommerce
    categoryScores: mongoose.Schema.Types.Mixed, // Dynamic category scores per domain
    enabled: {
      type: Boolean,
      default: true
    }
  }],

  // Legacy News Preferences (for backward compatibility)
  interests: [{
    type: String,
    enum: ['Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'Other']
  }],

  userType: {
    type: String,
    enum: ['general', 'finance', 'politics', 'tech'],
    default: 'general'
  },

  // Generic Content History (works for all domains)
  contentHistory: [{
    contentId: String,
    domain: String,
    type: String, // news, product, social_post, etc.
    readAt: Date,
    timeSpent: Number, // seconds
    interactionType: String // 'view', 'click', 'purchase', 'like', 'share'
  }],

  // Legacy Reading History (backward compatibility)
  readArticles: [{
    newsId: String,
    readAt: Date,
    timeSpent: Number // seconds
  }],

  // Legacy Personalization Scores (backward compatibility)
  categoryScores: {
    politics: { type: Number, default: 50 },
    business: { type: Number, default: 50 },
    technology: { type: Number, default: 50 },
    sports: { type: Number, default: 50 },
    entertainment: { type: Number, default: 50 },
    health: { type: Number, default: 50 }
  },

  // Engagement Metrics
  totalArticlesRead: {
    type: Number,
    default: 0
  },
  averageReadTime: {
    type: Number,
    default: 0
  },
  lastActiveAt: Date,

  // Settings
  notifications: {
    breaking: { type: Boolean, default: true },
    daily: { type: Boolean, default: true },
    weekly: { type: Boolean, default: false }
  },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed

}, {
  timestamps: true,
  collection: 'user_profiles'
});

// Indexes
userProfileSchema.index({ email: 1 });
userProfileSchema.index({ userType: 1 });
userProfileSchema.index({ lastActiveAt: -1 });

// Methods - Generic (multi-domain)
userProfileSchema.methods.recordContentInteraction = function(contentId, domain, type, timeSpent, interactionType = 'view') {
  this.contentHistory.push({
    contentId,
    domain,
    type,
    readAt: new Date(),
    timeSpent,
    interactionType
  });

  this.totalArticlesRead += 1;
  this.lastActiveAt = new Date();

  // Keep only last 200 items
  if (this.contentHistory.length > 200) {
    this.contentHistory = this.contentHistory.slice(-200);
  }

  return this.save();
};

userProfileSchema.methods.getDomainPreference = function(domain) {
  let pref = this.domainPreferences.find(p => p.domain === domain);

  // Create default if not exists
  if (!pref) {
    pref = {
      domain,
      interests: [],
      userSegment: 'general',
      categoryScores: {},
      enabled: true
    };
    this.domainPreferences.push(pref);
  }

  return pref;
};

userProfileSchema.methods.updateDomainCategoryScore = function(domain, category, delta) {
  const pref = this.getDomainPreference(domain);

  if (!pref.categoryScores) {
    pref.categoryScores = {};
  }

  const currentScore = pref.categoryScores[category] || 50;
  pref.categoryScores[category] = Math.max(0, Math.min(100, currentScore + delta));

  this.markModified('domainPreferences');
  return this.save();
};

userProfileSchema.methods.addDomainInterest = function(domain, interest) {
  const pref = this.getDomainPreference(domain);

  if (!pref.interests.includes(interest)) {
    pref.interests.push(interest);
    this.markModified('domainPreferences');
  }

  return this.save();
};

userProfileSchema.methods.setDomainSegment = function(domain, segment) {
  const pref = this.getDomainPreference(domain);
  pref.userSegment = segment;
  this.markModified('domainPreferences');
  return this.save();
};

// Legacy Methods (backward compatibility)
userProfileSchema.methods.recordArticleRead = function(newsId, timeSpent) {
  // Also record in generic history
  this.recordContentInteraction(newsId, 'news', 'news', timeSpent, 'view');

  this.readArticles.push({
    newsId,
    readAt: new Date(),
    timeSpent
  });

  // Keep only last 100 articles
  if (this.readArticles.length > 100) {
    this.readArticles = this.readArticles.slice(-100);
  }

  return this.save();
};

userProfileSchema.methods.updateCategoryScore = function(category, delta) {
  // Update both legacy and generic
  const categoryKey = category.toLowerCase();
  if (this.categoryScores[categoryKey] !== undefined) {
    this.categoryScores[categoryKey] = Math.max(0, Math.min(100,
      this.categoryScores[categoryKey] + delta
    ));
  }

  // Also update in domain preferences
  this.updateDomainCategoryScore('news', category, delta);

  return this.save();
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
