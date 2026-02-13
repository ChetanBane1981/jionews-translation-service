import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

/**
 * Ranking Agent - Autonomous trending detection and ranking
 */
export class RankingAgent extends BaseAgent {
  constructor() {
    super('RankingAgent', { autoRetry: true });

    this.trendingNews = new Map(); // Track trending topics
    this.categoryTrends = new Map(); // Track by category
    this.timeWindow = 3600000; // 1 hour trending window
  }

  async initialize() {
    await super.initialize();

    logger.info('[RankingAgent] Initialized with trending detection');
  }

  /**
   * Execute: Rank news items
   */
  async execute(task) {
    const { headline } = task;

    logger.info(`[RankingAgent] Ranking: ${headline.title}`);

    // Calculate ranking score
    const rankingScore = this.calculateRankingScore(headline);

    // Detect if trending
    const isTrending = this.detectTrending(headline);

    // Calculate engagement potential
    const engagementScore = this.calculateEngagementScore(headline);

    // Determine priority
    const priority = this.determinePriority(rankingScore, isTrending, headline);

    return {
      ...headline,
      rankingScore,
      isTrending,
      engagementScore,
      priority,
      rankedAt: new Date()
    };
  }

  /**
   * Calculate overall ranking score (0-100)
   */
  calculateRankingScore(headline) {
    let score = 0;

    // Importance Score (40%)
    score += (headline.importanceScore || 50) * 0.4;

    // Credibility Score (30%)
    score += (headline.credibilityScore || 50) * 0.3;

    // Recency (20%)
    const recencyScore = this.calculateRecencyScore(headline.publishedAt);
    score += recencyScore * 0.2;

    // Relevance/Personalization (10%)
    score += (headline.relevanceScore || 50) * 0.1;

    // Bonus for breaking news
    if (headline.breaking) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate recency score
   */
  calculateRecencyScore(publishedAt) {
    if (!publishedAt) return 50;

    const now = Date.now();
    const publishTime = new Date(publishedAt).getTime();
    const ageInHours = (now - publishTime) / 3600000;

    // Exponential decay
    // 0 hours = 100 points
    // 24 hours = 50 points
    // 48 hours = 25 points
    const score = 100 * Math.exp(-0.029 * ageInHours);

    return Math.round(score);
  }

  /**
   * Detect if news is trending
   */
  detectTrending(headline) {
    const now = Date.now();

    // Extract keywords from title
    const keywords = this.extractKeywords(headline.title);

    // Check if any keyword is trending
    let trendingCount = 0;

    for (const keyword of keywords) {
      if (this.trendingNews.has(keyword)) {
        const trend = this.trendingNews.get(keyword);

        // Check if within time window
        if (now - trend.firstSeen < this.timeWindow) {
          trend.count++;
          trend.lastSeen = now;

          // Trending if seen 3+ times in time window
          if (trend.count >= 3) {
            trendingCount++;
          }
        } else {
          // Reset if outside window
          this.trendingNews.set(keyword, {
            count: 1,
            firstSeen: now,
            lastSeen: now
          });
        }
      } else {
        // First occurrence
        this.trendingNews.set(keyword, {
          count: 1,
          firstSeen: now,
          lastSeen: now
        });
      }
    }

    // Trending if multiple keywords are trending
    return trendingCount >= 2;
  }

  /**
   * Extract keywords from title
   */
  extractKeywords(title) {
    if (!title) return [];

    // Remove common words
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'after'
    ];

    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));

    return words.slice(0, 5); // Top 5 keywords
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(headline) {
    let score = 50; // Base score

    // Breaking news = high engagement
    if (headline.breaking) {
      score += 30;
    }

    // High urgency = higher engagement
    if (headline.urgency === 'Critical') {
      score += 20;
    } else if (headline.urgency === 'High') {
      score += 10;
    }

    // Trending = higher engagement
    if (this.detectTrending(headline)) {
      score += 20;
    }

    // Category engagement weights
    const categoryWeights = {
      'Politics': 10,
      'Business': 8,
      'Technology': 12,
      'Sports': 15,
      'Entertainment': 10,
      'Health': 8
    };

    score += categoryWeights[headline.category] || 5;

    return Math.min(100, score);
  }

  /**
   * Determine priority level
   */
  determinePriority(rankingScore, isTrending, headline) {
    if (headline.breaking || rankingScore >= 90 || isTrending) {
      return 'critical';
    }

    if (rankingScore >= 70) {
      return 'high';
    }

    if (rankingScore >= 50) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get top trending news
   */
  getTrendingNews(limit = 10) {
    const now = Date.now();
    const trending = [];

    for (const [keyword, trend] of this.trendingNews.entries()) {
      if (now - trend.firstSeen < this.timeWindow && trend.count >= 3) {
        trending.push({
          keyword,
          count: trend.count,
          firstSeen: trend.firstSeen,
          lastSeen: trend.lastSeen
        });
      }
    }

    return trending
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clean up old trending data
   */
  cleanup() {
    const now = Date.now();

    for (const [keyword, trend] of this.trendingNews.entries()) {
      if (now - trend.lastSeen > this.timeWindow * 2) {
        this.trendingNews.delete(keyword);
      }
    }
  }

  /**
   * Get health with trending stats
   */
  getHealth() {
    const health = super.getHealth();

    health.trending = {
      totalKeywords: this.trendingNews.size,
      topTrending: this.getTrendingNews(5)
    };

    return health;
  }
}

export default RankingAgent;
