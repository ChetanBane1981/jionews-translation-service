import { DetectionAgent } from '../detection-agent.js';

describe('DetectionAgent', () => {
  let agent;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      anthropicApiKey: 'test-key',
      breakingThreshold: 70
    };
    agent = new DetectionAgent(mockConfig);
  });

  afterEach(() => {
    if (agent) {
      agent.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('detection');
    });

    test('should initialize breaking keywords list', () => {
      expect(agent.breakingKeywords).toBeInstanceOf(Array);
      expect(agent.breakingKeywords.length).toBeGreaterThan(0);
    });

    test('should set breaking threshold from config', () => {
      expect(agent.breakingThreshold).toBe(70);
    });
  });

  describe('Breaking News Keyword Detection', () => {
    test('should detect "breaking" keyword', () => {
      const headline = { title: 'Breaking: Major incident reported' };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(true);
    });

    test('should detect "urgent" keyword', () => {
      const headline = { title: 'Urgent: Immediate action required' };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(true);
    });

    test('should detect keywords in description', () => {
      const headline = {
        title: 'Latest updates',
        description: 'Breaking news from the capital'
      };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(true);
    });

    test('should be case insensitive', () => {
      const headline = { title: 'BREAKING NEWS UPDATE' };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(true);
    });

    test('should not detect breaking in normal news', () => {
      const headline = {
        title: 'Regular news article',
        description: 'Standard reporting on daily events'
      };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(false);
    });

    test('should handle missing title and description', () => {
      const headline = {};
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(false);
    });
  });

  describe('Recency Scoring', () => {
    test('should give high score to recent news (within 1 hour)', () => {
      const now = new Date();
      const headline = { publishedAt: new Date(now - 30 * 60 * 1000) }; // 30 min ago
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    test('should give medium score to news within 6 hours', () => {
      const now = new Date();
      const headline = { publishedAt: new Date(now - 3 * 60 * 60 * 1000) }; // 3 hours ago
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThan(90);
    });

    test('should give low score to old news (>24 hours)', () => {
      const now = new Date();
      const headline = { publishedAt: new Date(now - 48 * 60 * 60 * 1000) }; // 2 days ago
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBeLessThan(50);
    });

    test('should give minimum score to very old news', () => {
      const now = new Date();
      const headline = { publishedAt: new Date(now - 7 * 24 * 60 * 60 * 1000) }; // 7 days ago
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBe(10);
    });

    test('should handle missing publishedAt with fetchedAt', () => {
      const headline = { fetchedAt: new Date() };
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBeGreaterThan(0);
    });

    test('should handle missing both dates', () => {
      const headline = {};
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBe(50);
    });
  });

  describe('Category Detection', () => {
    test('should detect Politics category', () => {
      const headline = {
        title: 'Government announces new policy',
        description: 'Prime Minister speaks about election'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Politics');
    });

    test('should detect Business category', () => {
      const headline = {
        title: 'Stock market reaches new high',
        description: 'Economy shows strong growth'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Business');
    });

    test('should detect Technology category', () => {
      const headline = {
        title: 'New AI breakthrough announced',
        description: 'Software update improves performance'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Technology');
    });

    test('should detect Sports category', () => {
      const headline = {
        title: 'Cricket team wins match',
        description: 'Football tournament begins next week'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Sports');
    });

    test('should detect Entertainment category', () => {
      const headline = {
        title: 'New movie breaks box office records',
        description: 'Celebrity announces new album'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Entertainment');
    });

    test('should detect Health category', () => {
      const headline = {
        title: 'New medical treatment approved',
        description: 'Hospital announces vaccination drive'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Health');
    });

    test('should default to Other for unclassified content', () => {
      const headline = {
        title: 'Random news article',
        description: 'Some content about something'
      };
      const category = agent.detectCategory(headline);
      expect(category).toBe('Other');
    });
  });

  describe('Urgency Assessment', () => {
    test('should assess Critical urgency for breaking + recent', () => {
      const headline = {
        title: 'Breaking: Emergency declared',
        publishedAt: new Date()
      };
      const importance = 90;
      const urgency = agent.assessUrgency(headline, importance);
      expect(urgency).toBe('Critical');
    });

    test('should assess High urgency for important recent news', () => {
      const headline = {
        title: 'Major incident reported',
        publishedAt: new Date(Date.now() - 30 * 60 * 1000)
      };
      const importance = 75;
      const urgency = agent.assessUrgency(headline, importance);
      expect(urgency).toBe('High');
    });

    test('should assess Medium urgency for moderate importance', () => {
      const headline = {
        title: 'Regular news update',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      };
      const importance = 55;
      const urgency = agent.assessUrgency(headline, importance);
      expect(urgency).toBe('Medium');
    });

    test('should assess Low urgency for old or unimportant news', () => {
      const headline = {
        title: 'Regular article',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      };
      const importance = 40;
      const urgency = agent.assessUrgency(headline, importance);
      expect(urgency).toBe('Low');
    });
  });

  describe('Importance Calculation', () => {
    test('should give high importance to breaking + recent + politics', () => {
      const headline = {
        title: 'Breaking: Government announces emergency',
        description: 'Prime Minister addresses nation',
        publishedAt: new Date()
      };
      const importance = agent.calculateImportance(headline, 'Politics');
      expect(importance).toBeGreaterThanOrEqual(70);
    });

    test('should give bonus to Politics and Business categories', () => {
      const politicsHeadline = {
        title: 'Political news',
        publishedAt: new Date()
      };
      const sportsHeadline = {
        title: 'Sports news',
        publishedAt: new Date()
      };
      const politicsScore = agent.calculateImportance(politicsHeadline, 'Politics');
      const sportsScore = agent.calculateImportance(sportsHeadline, 'Sports');
      expect(politicsScore).toBeGreaterThan(sportsScore);
    });

    test('should give bonus for breaking keywords', () => {
      const breakingHeadline = {
        title: 'Breaking news alert',
        publishedAt: new Date()
      };
      const regularHeadline = {
        title: 'Regular news',
        publishedAt: new Date()
      };
      const breakingScore = agent.calculateImportance(breakingHeadline, 'Other');
      const regularScore = agent.calculateImportance(regularHeadline, 'Other');
      expect(breakingScore).toBeGreaterThan(regularScore);
    });
  });

  describe('Task Execution', () => {
    test('should process headline and return detection results', async () => {
      const task = {
        type: 'detect_breaking',
        headline: {
          id: 'test-123',
          title: 'Breaking: Major announcement',
          description: 'Government makes urgent statement',
          publishedAt: new Date()
        }
      };

      const result = await agent.execute(task);

      expect(result).toHaveProperty('newsId', 'test-123');
      expect(result).toHaveProperty('breaking');
      expect(result).toHaveProperty('importanceScore');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('category');
      expect(result.breaking).toBe(true);
      expect(result.importanceScore).toBeGreaterThanOrEqual(0);
      expect(result.importanceScore).toBeLessThanOrEqual(100);
    });

    test('should classify non-breaking news correctly', async () => {
      const task = {
        type: 'detect_breaking',
        headline: {
          id: 'test-456',
          title: 'Regular sports update',
          description: 'Match scheduled for next week',
          publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      };

      const result = await agent.execute(task);

      expect(result.breaking).toBe(false);
      expect(result.importanceScore).toBeLessThan(70);
    });

    test('should handle missing headline gracefully', async () => {
      const task = {
        type: 'detect_breaking'
      };

      await expect(agent.execute(task)).rejects.toThrow('No headline provided');
    });

    test('should emit breaking:detected event for breaking news', (done) => {
      const task = {
        type: 'detect_breaking',
        headline: {
          id: 'test-123',
          title: 'Breaking: Emergency declared',
          publishedAt: new Date()
        }
      };

      agent.on('breaking:detected', (data) => {
        expect(data).toHaveProperty('newsId');
        expect(data.breaking).toBe(true);
        done();
      });

      agent.execute(task);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long titles', () => {
      const longTitle = 'A'.repeat(500);
      const headline = { title: longTitle };
      const category = agent.detectCategory(headline);
      expect(category).toBeTruthy();
    });

    test('should handle special characters in title', () => {
      const headline = { title: '🔥 Breaking: Major event! 🚨' };
      const hasKeywords = agent.hasBreakingKeywords(headline);
      expect(hasKeywords).toBe(true);
    });

    test('should handle future dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const headline = { publishedAt: futureDate };
      const score = agent.calculateRecencyScore(headline);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
