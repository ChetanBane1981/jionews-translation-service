import { BaseAgent } from './BaseAgent.js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

/**
 * Summary Agent - Autonomous article generation and translation
 */
export class SummaryAgent extends BaseAgent {
  constructor() {
    super('SummaryAgent', {
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

    const prompt = `Generate a professional news summary of EXACTLY 60 words:

Title: ${headline.title}
Description: ${headline.description || 'N/A'}

Requirements:
- EXACTLY 60 words (not 59, not 61, exactly 60)
- Professional journalistic tone
- Cover the key facts and context
- No additional commentary

Provide ONLY the 60-word summary, nothing else.`;

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content[0].text.trim();
    const wordCount = summary.split(/\s+/).length;

    logger.info(`[SummaryAgent] ✅ Generated ${wordCount}-word summary for: ${headline.title}`);

    return {
      ...headline,
      summary,
      aiSummary: summary,
      summaryWordCount: wordCount,
      generatedAt: new Date()
    };
  }
}

export default SummaryAgent;
