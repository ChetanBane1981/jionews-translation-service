import { DetectionAgent } from '../detection-agent.js';

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('DetectionAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new DetectionAgent();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (agent && agent.status !== 'shutdown') {
      agent.shutdown();
    }
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('DetectionAgent');
    });

    test('should have autoRetry enabled', () => {
      expect(agent.config.autoRetry).toBe(true);
    });

    test('should have correct model configured', () => {
      expect(agent.config.model).toBe('claude-sonnet-4-5-20250929');
    });

    test('should initialize anthropic client on initialize', async () => {
      await agent.initialize();
      expect(agent.anthropic).toBeTruthy();
      expect(agent.status).toBe('ready');
    });
  });

  describe('Helper Methods', () => {
    describe('extractScore', () => {
      test('should extract score from text with slash format', () => {
        const text = 'The importance score is 85/100';
        const score = agent.extractScore(text);
        expect(score).toBe(85);
      });

      test('should extract score with "score:" prefix', () => {
        const text = 'Overall assessment: score: 72';
        const score = agent.extractScore(text);
        expect(score).toBe(72);
      });

      test('should return default 50 if no score found', () => {
        const text = 'No score in this text';
        const score = agent.extractScore(text);
        expect(score).toBe(50);
      });
    });

    describe('extractUrgency', () => {
      test('should detect Critical urgency', () => {
        const text = 'This is CRITICAL news';
        const urgency = agent.extractUrgency(text);
        expect(urgency).toBe('Critical');
      });

      test('should detect High urgency', () => {
        const text = 'High importance alert';
        const urgency = agent.extractUrgency(text);
        expect(urgency).toBe('High');
      });

      test('should detect Low urgency', () => {
        const text = 'Low priority update';
        const urgency = agent.extractUrgency(text);
        expect(urgency).toBe('Low');
      });

      test('should default to Medium urgency', () => {
        const text = 'Regular news update';
        const urgency = agent.extractUrgency(text);
        expect(urgency).toBe('Medium');
      });

      test('should be case insensitive', () => {
        expect(agent.extractUrgency('critical alert')).toBe('Critical');
        expect(agent.extractUrgency('HIGH priority')).toBe('High');
        expect(agent.extractUrgency('low impact')).toBe('Low');
      });
    });

    describe('extractCategory', () => {
      test('should detect Politics category', () => {
        const text = 'Government announces new politics initiative';
        const category = agent.extractCategory(text);
        expect(category).toBe('Politics');
      });

      test('should detect Business category', () => {
        const text = 'Stock market business news';
        const category = agent.extractCategory(text);
        expect(category).toBe('Business');
      });

      test('should detect Technology category', () => {
        const text = 'New technology breakthrough';
        const category = agent.extractCategory(text);
        expect(category).toBe('Technology');
      });

      test('should detect Sports category', () => {
        const text = 'Major sports championship';
        const category = agent.extractCategory(text);
        expect(category).toBe('Sports');
      });

      test('should detect Entertainment category', () => {
        const text = 'Entertainment industry news';
        const category = agent.extractCategory(text);
        expect(category).toBe('Entertainment');
      });

      test('should detect Health category', () => {
        const text = 'New health guidelines released';
        const category = agent.extractCategory(text);
        expect(category).toBe('Health');
      });

      test('should default to Other for unknown categories', () => {
        const text = 'Random miscellaneous news';
        const category = agent.extractCategory(text);
        expect(category).toBe('Other');
      });

      test('should be case insensitive', () => {
        expect(agent.extractCategory('POLITICS')).toBe('Politics');
        expect(agent.extractCategory('technology')).toBe('Technology');
      });
    });
  });

  describe('Parse Analysis', () => {
    test('should parse valid JSON response', () => {
      const response = JSON.stringify({
        'Breaking News': 'Yes',
        'Importance Score': 85,
        'Urgency Level': 'High',
        'Category': 'Politics',
        'Reasoning': 'Major political development'
      });

      const result = agent.parseAnalysis(response);

      expect(result.breaking).toBe(true);
      expect(result.importanceScore).toBe(85);
      expect(result.urgency).toBe('High');
      expect(result.category).toBe('Politics');
      expect(result.reasoning).toBe('Major political development');
    });

    test('should parse camelCase JSON format', () => {
      const response = JSON.stringify({
        breaking: true,
        importanceScore: 75,
        urgency: 'Medium',
        category: 'Business',
        reasoning: 'Economic impact'
      });

      const result = agent.parseAnalysis(response);

      expect(result.breaking).toBe(true);
      expect(result.importanceScore).toBe(75);
      expect(result.urgency).toBe('Medium');
      expect(result.category).toBe('Business');
    });

    test('should extract JSON from text with surrounding content', () => {
      const text = `Analysis complete. Here are the results:

      {"breaking": true, "importanceScore": 90, "urgency": "Critical", "category": "Politics", "reasoning": "Emergency situation"}

      End of analysis.`;

      const result = agent.parseAnalysis(text);

      expect(result.breaking).toBe(true);
      expect(result.importanceScore).toBe(90);
      expect(result.urgency).toBe('Critical');
    });

    test('should handle "No" for breaking news', () => {
      const response = JSON.stringify({
        'Breaking News': 'No',
        'Importance Score': 40
      });

      const result = agent.parseAnalysis(response);

      expect(result.breaking).toBe(false);
    });

    test('should use fallback parsing for non-JSON text', () => {
      const text = 'Breaking News: Yes, Importance: 80/100, High urgency, Politics category';

      const result = agent.parseAnalysis(text);

      expect(result.breaking).toBe(true); // Contains 'yes'
      expect(result.importanceScore).toBe(80);
      expect(result.urgency).toBe('High');
      expect(result.category).toBe('Politics');
    });

    test('should return defaults on parse error', () => {
      const invalidText = ''; // Empty string

      const result = agent.parseAnalysis(invalidText);

      expect(result.breaking).toBe(false);
      expect(result.importanceScore).toBe(50);
      expect(result.urgency).toBe('Medium');
      expect(result.category).toBe('Other');
      expect(result.reasoning).toBeDefined(); // Empty string is defined
    });

    test('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"breaking": true, "importanceScore": 80'; // Missing closing brace

      const result = agent.parseAnalysis(malformedJson);

      // Should use fallback parsing
      expect(result).toHaveProperty('breaking');
      expect(result).toHaveProperty('importanceScore');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('category');
    });
  });

  describe('Execute Method', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should process headline and call Claude API', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            'Breaking News': 'Yes',
            'Importance Score': 85,
            'Urgency Level': 'High',
            'Category': 'Politics',
            'Reasoning': 'Major announcement'
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Breaking: Major Political Event',
          description: 'Government announces changes',
          sourceName: 'Reuters',
          publishedAt: new Date()
        }
      };

      const result = await agent.execute(task);

      expect(agent.anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024
        })
      );

      expect(result.breaking).toBe(true);
      expect(result.importanceScore).toBe(85);
      expect(result.urgency).toBe('High');
      expect(result.category).toBe('Politics');
    });

    test('should include headline data in result', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            breaking: false,
            importanceScore: 60,
            urgency: 'Medium',
            category: 'Sports',
            reasoning: 'Regular sports news'
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const headline = {
        id: 'test-456',
        title: 'Sports Update',
        description: 'Team wins match',
        sourceName: 'ESPN'
      };

      const task = { headline };
      const result = await agent.execute(task);

      expect(result.id).toBe('test-456');
      expect(result.title).toBe('Sports Update');
      expect(result.breaking).toBe(false);
      expect(result.category).toBe('Sports');
    });

    test('should handle API errors', async () => {
      agent.anthropic.messages.create.mockRejectedValue(new Error('API Error'));

      const task = {
        headline: {
          id: 'test-123',
          title: 'Test'
        }
      };

      await expect(agent.execute(task)).rejects.toThrow('API Error');
    });

    test('should add detectionReasoning to result', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            breaking: true,
            importanceScore: 90,
            urgency: 'Critical',
            category: 'Health',
            reasoning: 'Public health emergency'
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Health Alert'
        }
      };

      const result = await agent.execute(task);

      expect(result.detectionReasoning).toBe('Public health emergency');
    });
  });

  describe('Make Decision', () => {
    test('should have makeDecision method', () => {
      expect(typeof agent.makeDecision).toBe('function');
    });
  });
});
