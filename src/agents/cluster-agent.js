import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

/**
 * Cluster Agent - Autonomous deduplication and clustering
 */
export class ClusterAgent extends BaseAgent {
  constructor() {
    super('ClusterAgent', { autoRetry: true });
    this.seenHeadlines = new Map();
  }

  async execute(task) {
    const { headline } = task;

    // Simple deduplication logic
    const normalized = this.normalizeText(headline.title);

    if (this.seenHeadlines.has(normalized)) {
      logger.info(`[ClusterAgent] Duplicate detected: ${headline.title}`);
      return {
        ...headline,
        isDuplicate: true,
        originalId: this.seenHeadlines.get(normalized)
      };
    }

    this.seenHeadlines.set(normalized, headline.id);

    return {
      ...headline,
      isDuplicate: false
    };
  }

  normalizeText(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }
}

export default ClusterAgent;
