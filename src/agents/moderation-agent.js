import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

/**
 * Moderation Agent - Autonomous content filtration
 */
export class ModerationAgent extends BaseAgent {
  constructor() {
    super('ModerationAgent', { autoRetry: true });
    this.filterRules = [];
  }

  async initialize() {
    await super.initialize();
    this.loadFilterRules();
  }

  loadFilterRules() {
    this.filterRules = [
      { type: 'spam', enabled: true },
      { type: 'offensive', enabled: true },
      { type: 'duplicate', enabled: true }
    ];
  }

  async execute(task) {
    const { headline } = task;

    const violations = [];

    // Apply filtration rules autonomously
    if (headline.isDuplicate) {
      violations.push('duplicate');
    }

    // Check for spam keywords
    const spamKeywords = ['click here', 'buy now', 'limited offer'];
    if (spamKeywords.some(kw => headline.title?.toLowerCase().includes(kw))) {
      violations.push('spam');
    }

    const passed = violations.length === 0;

    return {
      ...headline,
      moderationPassed: passed,
      violations,
      requiresApproval: !passed
    };
  }
}

export default ModerationAgent;
