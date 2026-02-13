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

  // News Preferences
  interests: [{
    type: String,
    enum: ['Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'Other']
  }],

  userType: {
    type: String,
    enum: ['general', 'finance', 'politics', 'tech'],
    default: 'general'
  },

  // Reading History
  readArticles: [{
    newsId: String,
    readAt: Date,
    timeSpent: Number // seconds
  }],

  // Personalization Scores
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

// Methods
userProfileSchema.methods.recordArticleRead = function(newsId, timeSpent) {
  this.readArticles.push({
    newsId,
    readAt: new Date(),
    timeSpent
  });

  this.totalArticlesRead += 1;
  this.lastActiveAt = new Date();

  // Keep only last 100 articles
  if (this.readArticles.length > 100) {
    this.readArticles = this.readArticles.slice(-100);
  }

  return this.save();
};

userProfileSchema.methods.updateCategoryScore = function(category, delta) {
  const categoryKey = category.toLowerCase();
  if (this.categoryScores[categoryKey] !== undefined) {
    this.categoryScores[categoryKey] = Math.max(0, Math.min(100,
      this.categoryScores[categoryKey] + delta
    ));
  }
  return this.save();
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
