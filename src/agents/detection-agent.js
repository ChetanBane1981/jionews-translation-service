import { BaseAgent } from './BaseAgent.js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

/**
 * Detection Agent - Autonomous breaking news detection
 * Uses Claude to evaluate news importance and urgency
 */
export class DetectionAgent extends BaseAgent {
  constructor() {
    super('DetectionAgent', {
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

    logger.info('[DetectionAgent] Claude AI initialized');
  }

  /**
   * Execute: Detect breaking news
   */
  async execute(task) {
    const { headline } = task;

    logger.info(`[DetectionAgent] Analyzing: ${headline.title}`);

    const prompt = `You are a breaking news detection AI for JioNews Sentinel.

Analyze the following news headline and determine if it's breaking news:

Title: ${headline.title}
Description: ${headline.description || 'N/A'}
Source: ${headline.sourceName || 'Unknown'}
Published: ${headline.publishedAt}

Provide a structured analysis:

1. Breaking News: Yes/No
2. Importance Score: 0-100
3. Urgency Level: Low/Medium/High/Critical
4. Category: Politics/Business/Technology/Sports/Entertainment/Health/Other
5. Reasoning: Brief explanation

Format your response as JSON.`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisText = response.content[0].text;
      const analysis = this.parseAnalysis(analysisText);

      logger.info(`[DetectionAgent] Analysis complete - Breaking: ${analysis.breaking}, Score: ${analysis.importanceScore}`);

      return {
        ...headline,
        breaking: analysis.breaking,
        importanceScore: analysis.importanceScore,
        urgency: analysis.urgency,
        category: analysis.category,
        detectionReasoning: analysis.reasoning
      };

    } catch (error) {
      logger.error('[DetectionAgent] Claude API error:', error.message);
      throw error;
    }
  }

  /**
   * Parse Claude's analysis response
   */
  parseAnalysis(text) {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          breaking: parsed['Breaking News']?.toLowerCase() === 'yes' || parsed.breaking === true,
          importanceScore: parseInt(parsed['Importance Score'] || parsed.importanceScore || 50),
          urgency: parsed['Urgency Level'] || parsed.urgency || 'Medium',
          category: parsed.Category || parsed.category || 'Other',
          reasoning: parsed.Reasoning || parsed.reasoning || 'AI analysis'
        };
      }

      // Fallback parsing
      return {
        breaking: text.toLowerCase().includes('yes'),
        importanceScore: this.extractScore(text),
        urgency: this.extractUrgency(text),
        category: this.extractCategory(text),
        reasoning: text.substring(0, 200)
      };

    } catch (error) {
      logger.error('[DetectionAgent] Parse error:', error.message);
      return {
        breaking: false,
        importanceScore: 50,
        urgency: 'Medium',
        category: 'Other',
        reasoning: 'Parse error - default values'
      };
    }
  }

  extractScore(text) {
    const scoreMatch = text.match(/(\d+)\/100|score:\s*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : 50;
  }

  extractUrgency(text) {
    if (text.match(/critical/i)) return 'Critical';
    if (text.match(/high/i)) return 'High';
    if (text.match(/low/i)) return 'Low';
    return 'Medium';
  }

  extractCategory(text) {
    const categories = ['Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health'];
    for (const cat of categories) {
      if (text.toLowerCase().includes(cat.toLowerCase())) {
        return cat;
      }
    }
    return 'Other';
  }

  /**
   * Autonomous decision making
   */
  async makeDecision(headline, criteria) {
    // Auto-approve if importance score is high enough
    if (headline.importanceScore >= 70) {
      return {
        approved: true,
        reasoning: `High importance score: ${headline.importanceScore}`
      };
    }

    // Request human approval for borderline cases
    if (headline.importanceScore >= 50 && headline.importanceScore < 70) {
      return {
        approved: false,
        requiresApproval: true,
        reasoning: 'Borderline importance - human review needed'
      };
    }

    // Reject low importance
    return {
      approved: false,
      reasoning: `Low importance score: ${headline.importanceScore}`
    };
  }
}

export default DetectionAgent;
