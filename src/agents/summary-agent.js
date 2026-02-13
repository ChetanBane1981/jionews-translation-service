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

    const prompt = `Generate a concise news summary:

Title: ${headline.title}
Description: ${headline.description || 'N/A'}

Provide a 2-3 sentence professional news summary.`;

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content[0].text;

    return {
      ...headline,
      summary,
      generatedAt: new Date()
    };
  }
}

export default SummaryAgent;
