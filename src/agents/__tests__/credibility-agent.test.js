import { CredibilityAgent } from '../credibility-agent.js';

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

describe('CredibilityAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new CredibilityAgent();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.CREDIBILITY_THRESHOLD = '70';
  });

  afterEach(() => {
    if (agent && agent.status !== 'shutdown') {
      agent.shutdown();
    }
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CREDIBILITY_THRESHOLD;
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('CredibilityAgent');
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

  describe('Response Parsing', () => {
    test('should parse valid JSON response', () => {
      const jsonResponse = JSON.stringify({
        credibilityScore: 85,
        fakeRisk: 'Low',
        trustScore: 90,
        reasoning: 'High credibility source',
        redFlags: []
      });

      const result = agent.parseResponse(jsonResponse);

      expect(result.credibilityScore).toBe(85);
      expect(result.fakeRisk).toBe('Low');
      expect(result.trustScore).toBe(90);
      expect(result.reasoning).toBe('High credibility source');
      expect(result.redFlags).toEqual([]);
    });

    test('should extract JSON from text with surrounding content', () => {
      const response = `Here is my analysis:

      {"credibilityScore": 60, "fakeRisk": "Medium", "trustScore": 65, "reasoning": "Mixed signals", "redFlags": ["clickbait"]}

      That concludes the analysis.`;

      const result = agent.parseResponse(response);

      expect(result.credibilityScore).toBe(60);
      expect(result.fakeRisk).toBe('Medium');
      expect(result.redFlags).toContain('clickbait');
    });

    test('should return default values on parse error', () => {
      const invalidResponse = 'This is not JSON at all';

      const result = agent.parseResponse(invalidResponse);

      expect(result.credibilityScore).toBe(50);
      expect(result.fakeRisk).toBe('Medium');
      expect(result.trustScore).toBe(50);
      expect(result.reasoning).toBe('Default analysis');
      expect(result.redFlags).toEqual([]);
    });

    test('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"credibilityScore": 80, "fakeRisk": "Low"'; // Missing closing brace

      const result = agent.parseResponse(malformedJson);

      // Should return defaults since JSON is malformed
      expect(result).toHaveProperty('credibilityScore');
      expect(result).toHaveProperty('fakeRisk');
    });

    test('should handle empty response', () => {
      const result = agent.parseResponse('');

      expect(result.credibilityScore).toBe(50);
      expect(result.fakeRisk).toBe('Medium');
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
            credibilityScore: 75,
            fakeRisk: 'Low',
            trustScore: 80,
            reasoning: 'Trusted source',
            redFlags: []
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Breaking News',
          description: 'Important announcement',
          sourceName: 'Reuters'
        }
      };

      const result = await agent.execute(task);

      expect(agent.anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024
        })
      );

      expect(result).toHaveProperty('credibilityScore', 75);
      expect(result).toHaveProperty('fakeRisk', 'Low');
      expect(result).toHaveProperty('trustScore', 80);
    });

    test('should include headline data in result', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 65,
            fakeRisk: 'Medium',
            trustScore: 70,
            reasoning: 'Some concerns',
            redFlags: ['sensational language']
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const headline = {
        id: 'test-123',
        title: 'Test Article',
        description: 'Test description',
        sourceName: 'Test Source'
      };

      const task = { headline };
      const result = await agent.execute(task);

      expect(result.id).toBe('test-123');
      expect(result.title).toBe('Test Article');
      expect(result.credibilityScore).toBe(65);
    });

    test('should set requiresApproval for low credibility', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 45, // Below threshold of 70
            fakeRisk: 'Medium',
            trustScore: 50,
            reasoning: 'Low credibility',
            redFlags: []
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Questionable News',
          sourceName: 'Unknown'
        }
      };

      const result = await agent.execute(task);

      expect(result.requiresApproval).toBe(true);
    });

    test('should set requiresApproval for high fake risk', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 75, // Above threshold
            fakeRisk: 'High', // But high risk
            trustScore: 50,
            reasoning: 'High fake news risk',
            redFlags: ['multiple red flags']
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Suspicious Article'
        }
      };

      const result = await agent.execute(task);

      expect(result.requiresApproval).toBe(true);
    });

    test('should not require approval for high credibility', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 85, // Above threshold
            fakeRisk: 'Low',
            trustScore: 90,
            reasoning: 'Trusted source',
            redFlags: []
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = {
        headline: {
          id: 'test-123',
          title: 'Official Announcement',
          sourceName: 'Reuters'
        }
      };

      const result = await agent.execute(task);

      expect(result.requiresApproval).toBe(false);
    });

    test('should handle API errors gracefully', async () => {
      agent.anthropic.messages.create.mockRejectedValue(new Error('API Error'));

      const task = {
        headline: {
          id: 'test-123',
          title: 'Test'
        }
      };

      await expect(agent.execute(task)).rejects.toThrow('API Error');
    });
  });

  describe('Credibility Threshold', () => {
    test('should use environment variable for threshold', async () => {
      process.env.CREDIBILITY_THRESHOLD = '80';

      await agent.initialize();

      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 75, // Between 70 and 80
            fakeRisk: 'Low',
            trustScore: 75,
            reasoning: 'Good',
            redFlags: []
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = { headline: { id: '123', title: 'Test' } };
      const result = await agent.execute(task);

      // Should require approval because 75 < 80
      expect(result.requiresApproval).toBe(true);
    });

    test('should use default threshold of 70 if not set', async () => {
      delete process.env.CREDIBILITY_THRESHOLD;

      await agent.initialize();

      const mockResponse = {
        content: [{
          text: JSON.stringify({
            credibilityScore: 75,
            fakeRisk: 'Low',
            trustScore: 75,
            reasoning: 'Good',
            redFlags: []
          })
        }]
      };

      agent.anthropic.messages.create.mockResolvedValue(mockResponse);

      const task = { headline: { id: '123', title: 'Test' } };
      const result = await agent.execute(task);

      // Should not require approval because 75 >= 70 (default)
      expect(result.requiresApproval).toBe(false);
    });
  });
});
