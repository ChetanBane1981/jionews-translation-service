import { BaseAgent } from './BaseAgent.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Feed Agent - Autonomous news feed ingestion
 * Continuously fetches headlines from multiple sources
 */
export class FeedAgent extends BaseAgent {
  constructor() {
    super('FeedAgent', {
      autoRetry: true,
      pollInterval: process.env.FEED_POLL_INTERVAL || 60000
    });

    this.sources = [];
    this.isIngesting = false;
    this.ingestedCount = 0;
  }

  async initialize() {
    await super.initialize();

    // Load news sources (in production, load from DB or config)
    this.sources = [
      {
        name: 'NewsAPI',
        url: 'https://newsapi.org/v2/top-headlines',
        type: 'api',
        enabled: true
      },
      {
        name: 'RSS Feed 1',
        url: 'http://rss.cnn.com/rss/edition.rss',
        type: 'rss',
        enabled: true
      },
      // Add more sources as needed
    ];

    logger.info(`[FeedAgent] Initialized with ${this.sources.length} sources`);
  }

  /**
   * Execute: Fetch from a single source
   */
  async execute(task) {
    const { source } = task;

    logger.info(`[FeedAgent] Fetching from: ${source.name}`);

    try {
      let headlines = [];

      if (source.type === 'api') {
        headlines = await this.fetchFromAPI(source);
      } else if (source.type === 'rss') {
        headlines = await this.fetchFromRSS(source);
      }

      logger.info(`[FeedAgent] Fetched ${headlines.length} headlines from ${source.name}`);

      // Emit fetched headlines for processing
      headlines.forEach((headline) => {
        this.emit('headline:fetched', {
          ...headline,
          source: source.name,
          fetchedAt: new Date()
        });
      });

      this.ingestedCount += headlines.length;

      return {
        source: source.name,
        count: headlines.length,
        headlines
      };

    } catch (error) {
      logger.error(`[FeedAgent] Error fetching from ${source.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch from API source
   */
  async fetchFromAPI(source) {
    try {
      const response = await axios.get(source.url, {
        params: {
          apiKey: process.env.NEWS_API_KEY,
          country: 'in',
          pageSize: 20
        },
        timeout: 10000
      });

      if (response.data && response.data.articles) {
        return response.data.articles.map(article => ({
          id: this.generateId(),
          title: article.title,
          description: article.description,
          url: article.url,
          imageUrl: article.urlToImage,
          publishedAt: new Date(article.publishedAt),
          sourceName: article.source.name,
          author: article.author
        }));
      }

      return [];

    } catch (error) {
      logger.error(`[FeedAgent] API fetch error:`, error.message);
      return [];
    }
  }

  /**
   * Fetch from RSS feed
   */
  async fetchFromRSS(source) {
    // In production, use proper RSS parser
    // For now, return mock data
    logger.info(`[FeedAgent] RSS parsing not implemented yet for ${source.name}`);
    return [];
  }

  /**
   * Start continuous ingestion
   */
  async startContinuousIngestion() {
    if (this.isIngesting) {
      logger.warn('[FeedAgent] Already ingesting');
      return;
    }

    this.isIngesting = true;
    logger.info('[FeedAgent] Starting continuous ingestion...');

    const ingest = async () => {
      if (!this.isIngesting) return;

      logger.info('[FeedAgent] Polling all sources...');

      // Process all enabled sources in parallel
      const tasks = this.sources
        .filter(source => source.enabled)
        .map(source => this.processTask({ source }));

      await Promise.allSettled(tasks);

      // Schedule next poll
      setTimeout(ingest, this.config.pollInterval);
    };

    // Start initial ingestion
    ingest();
  }

  /**
   * Stop continuous ingestion
   */
  stopIngestion() {
    this.isIngesting = false;
    logger.info('[FeedAgent] Stopped continuous ingestion');
  }

  /**
   * Generate unique ID for headlines
   */
  generateId() {
    return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    this.stopIngestion();
    await super.shutdown();
  }
}

export default FeedAgent;
