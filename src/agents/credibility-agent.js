import { BaseAgent } from './BaseAgent.js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

/**
 * Credibility Agent - Autonomous fake news detection
 * Scores credibility and fake risk for each news item
 */
export class CredibilityAgent extends BaseAgent {
  constructor() {
    super('CredibilityAgent', {
      autoRetry: true,
      model: 'claude-sonnet-4-5-20250929'
    });
    this.anthropic = null;
  }

  async initialize() {
    await super.initialize();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async execute(task) {
    const { headline } = task;

    const prompt = `Analyze this news for credibility and fake news risk:

Title: ${headline.title}
Description: ${headline.description || 'N/A'}
Source: ${headline.sourceName || 'Unknown'}

Provide JSON response:
{
  "credibilityScore": 0-100,
  "fakeRisk": "Low/Medium/High",
  "trustScore": 0-100,
  "reasoning": "brief explanation",
  "redFlags": ["flag1", "flag2"]
}`;

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = this.parseResponse(response.content[0].text);

    // Autonomous decision: require approval if credibility is low
    const requiresApproval = analysis.credibilityScore < parseInt(process.env.CREDIBILITY_THRESHOLD || 70) ||
                             analysis.fakeRisk === 'High';

    return {
      ...headline,
      credibilityScore: analysis.credibilityScore,
      fakeRisk: analysis.fakeRisk,
      trustScore: analysis.trustScore,
      credibilityReasoning: analysis.reasoning,
      redFlags: analysis.redFlags,
      requiresApproval
    };
  }

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.error('[CredibilityAgent] Parse error');
    }

    return {
      credibilityScore: 50,
      fakeRisk: 'Medium',
      trustScore: 50,
      reasoning: 'Default analysis',
      redFlags: []
    };
  }
}

export default CredibilityAgent;
