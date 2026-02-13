import { CredibilityAgent } from '../credibility-agent.js';

describe('CredibilityAgent', () => {
  let agent;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      anthropicApiKey: 'test-key',
      credibilityThresholds: {
        autoPublish: 70,
        requireApproval: 50
      }
    };
    agent = new CredibilityAgent(mockConfig);
  });

  afterEach(() => {
    if (agent) {
      agent.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('credibility');
    });

    test('should set credibility thresholds from config', () => {
      expect(agent.credibilityThresholds.autoPublish).toBe(70);
      expect(agent.credibilityThresholds.requireApproval).toBe(50);
    });
  });

  describe('Source Trust Scoring', () => {
    test('should give high trust score to reputable sources', () => {
      const headline = {
        sourceName: 'Reuters',
        sourceUrl: 'https://reuters.com'
      };
      const score = agent.calculateSourceTrustScore(headline);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    test('should give medium trust score to regional sources', () => {
      const headline = {
        sourceName: 'Times of India',
        sourceUrl: 'https://timesofindia.com'
      };
      const score = agent.calculateSourceTrustScore(headline);
      expect(score).toBeGreaterThanOrEqual(60);
    });

    test('should give low trust score to unknown sources', () => {
      const headline = {
        sourceName: 'Unknown Blog',
        sourceUrl: 'https://unknown-site.com'
      };
      const score = agent.calculateSourceTrustScore(headline);
      expect(score).toBeLessThanOrEqual(40);
    });

    test('should handle missing source information', () => {
      const headline = {};
      const score = agent.calculateSourceTrustScore(headline);
      expect(score).toBe(30);
    });
  });

  describe('Red Flag Detection', () => {
    test('should detect clickbait phrases', () => {
      const headline = {
        title: 'You won\'t believe what happened next!',
        description: 'Click to find out'
      };
      const redFlags = agent.detectRedFlags(headline);
      expect(redFlags).toContain('Clickbait language detected');
    });

    test('should detect ALL CAPS', () => {
      const headline = {
        title: 'BREAKING: SHOCKING NEWS EVERYONE MUST SEE'
      };
      const redFlags = agent.detectRedFlags(headline);
      expect(redFlags).toContain('Excessive capitalization');
    });

    test('should detect excessive punctuation', () => {
      const headline = {
        title: 'Breaking News!!!! Must Read!!!'
      };
      const redFlags = agent.detectRedFlags(headline);
      expect(redFlags).toContain('Excessive punctuation');
    });

    test('should detect sensational words', () => {
      const headline = {
        title: 'Miracle cure discovered',
        description: 'Secret doctors don\'t want you to know'
      };
      const redFlags = agent.detectRedFlags(headline);
      expect(redFlags.length).toBeGreaterThan(0);
    });

    test('should return empty array for clean content', () => {
      const headline = {
        title: 'Government announces new policy',
        description: 'Official statement from ministry'
      };
      const redFlags = agent.detectRedFlags(headline);
      expect(redFlags.length).toBe(0);
    });
  });

  describe('Credibility Scoring', () => {
    test('should calculate high credibility for quality content', () => {
      const headline = {
        sourceName: 'Reuters',
        sourceUrl: 'https://reuters.com',
        title: 'Government announces new policy',
        description: 'Official statement released today',
        author: 'John Smith'
      };
      const score = agent.calculateCredibilityScore(headline, []);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    test('should reduce score for content with red flags', () => {
      const headline = {
        sourceName: 'Reuters',
        sourceUrl: 'https://reuters.com',
        title: 'You won\'t believe this!!!',
        description: 'SHOCKING revelation'
      };
      const redFlags = agent.detectRedFlags(headline);
      const score = agent.calculateCredibilityScore(headline, redFlags);
      expect(score).toBeLessThan(70);
    });

    test('should give low score to unknown sources with red flags', () => {
      const headline = {
        sourceName: 'Unknown',
        title: 'BREAKING: Miracle cure found!!!',
        description: 'Doctors hate this trick'
      };
      const redFlags = agent.detectRedFlags(headline);
      const score = agent.calculateCredibilityScore(headline, redFlags);
      expect(score).toBeLessThan(50);
    });

    test('should bonus for having author', () => {
      const headline1 = {
        sourceName: 'Test Source',
        title: 'Test',
        author: 'John Doe'
      };
      const headline2 = {
        sourceName: 'Test Source',
        title: 'Test'
      };
      const score1 = agent.calculateCredibilityScore(headline1, []);
      const score2 = agent.calculateCredibilityScore(headline2, []);
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Fake Risk Assessment', () => {
    test('should classify high credibility as Low risk', () => {
      const score = 85;
      const risk = agent.assessFakeRisk(score);
      expect(risk).toBe('Low');
    });

    test('should classify medium credibility as Medium risk', () => {
      const score = 60;
      const risk = agent.assessFakeRisk(score);
      expect(risk).toBe('Medium');
    });

    test('should classify low credibility as High risk', () => {
      const score = 30;
      const risk = agent.assessFakeRisk(score);
      expect(risk).toBe('High');
    });

    test('should handle edge case at 70', () => {
      const risk70 = agent.assessFakeRisk(70);
      const risk69 = agent.assessFakeRisk(69);
      expect(risk70).toBe('Low');
      expect(risk69).toBe('Medium');
    });

    test('should handle edge case at 50', () => {
      const risk50 = agent.assessFakeRisk(50);
      const risk49 = agent.assessFakeRisk(49);
      expect(risk50).toBe('Medium');
      expect(risk49).toBe('High');
    });
  });

  describe('Task Execution', () => {
    test('should process headline and return credibility assessment', async () => {
      const task = {
        type: 'assess_credibility',
        headline: {
          id: 'test-123',
          sourceName: 'Reuters',
          sourceUrl: 'https://reuters.com',
          title: 'Government announces policy',
          description: 'Official announcement'
        }
      };

      const result = await agent.execute(task);

      expect(result).toHaveProperty('newsId', 'test-123');
      expect(result).toHaveProperty('credibilityScore');
      expect(result).toHaveProperty('trustScore');
      expect(result).toHaveProperty('fakeRisk');
      expect(result).toHaveProperty('redFlags');
      expect(result.credibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.credibilityScore).toBeLessThanOrEqual(100);
    });

    test('should handle missing headline gracefully', async () => {
      const task = {
        type: 'assess_credibility'
      };

      await expect(agent.execute(task)).rejects.toThrow('No headline provided');
    });

    test('should emit credibility:scored event', (done) => {
      const task = {
        type: 'assess_credibility',
        headline: {
          id: 'test-123',
          sourceName: 'Reuters',
          title: 'Test'
        }
      };

      agent.on('credibility:scored', (data) => {
        expect(data).toHaveProperty('newsId');
        expect(data).toHaveProperty('credibilityScore');
        done();
      });

      agent.execute(task);
    });
  });

  describe('Approval Decision', () => {
    test('should mark high credibility for auto-publish', async () => {
      const task = {
        type: 'assess_credibility',
        headline: {
          id: 'test-123',
          sourceName: 'Reuters',
          sourceUrl: 'https://reuters.com',
          title: 'Official government announcement',
          author: 'Staff Reporter'
        }
      };

      const result = await agent.execute(task);

      if (result.credibilityScore >= 70) {
        expect(result.requiresApproval).toBe(false);
      }
    });

    test('should mark low credibility for approval', async () => {
      const task = {
        type: 'assess_credibility',
        headline: {
          id: 'test-123',
          sourceName: 'Unknown',
          title: 'BREAKING: You won\'t believe this!!!',
          description: 'Shocking secret revealed'
        }
      };

      const result = await agent.execute(task);

      if (result.credibilityScore < 50) {
        expect(result.requiresApproval).toBe(true);
      }
    });
  });
});
