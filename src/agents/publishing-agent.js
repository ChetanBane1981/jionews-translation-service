import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

/**
 * Publishing Agent - Autonomous publishing with approval logic
 */
export class PublishingAgent extends BaseAgent {
  constructor() {
    super('PublishingAgent', { autoRetry: true });
    this.publishedCount = 0;
  }

  async execute(task) {
    const { headline } = task;

    // Autonomous decision: auto-publish or request approval
    const autoPublishThreshold = parseInt(process.env.AUTO_PUBLISH_THRESHOLD || 80);

    const canAutoPublish =
      headline.credibilityScore >= autoPublishThreshold &&
      headline.moderationPassed &&
      !headline.isDuplicate &&
      headline.fakeRisk !== 'High';

    if (canAutoPublish) {
      // Auto-publish
      await this.publish(headline);

      return {
        ...headline,
        published: true,
        publishedAt: new Date(),
        autoPublished: true,
        requiresApproval: false
      };
    } else {
      // Request human approval
      logger.warn(`[PublishingAgent] Human approval required for: ${headline.title}`);

      return {
        ...headline,
        published: false,
        requiresApproval: true,
        approvalReason: this.getApprovalReason(headline)
      };
    }
  }

  async publish(headline) {
    // In production: send to frontend, database, notification service
    logger.info(`[PublishingAgent] ✓ Published: ${headline.title}`);
    this.publishedCount++;
    this.emit('article:published', headline);
  }

  getApprovalReason(headline) {
    const reasons = [];

    if (headline.credibilityScore < 80) {
      reasons.push(`Low credibility (${headline.credibilityScore})`);
    }
    if (!headline.moderationPassed) {
      reasons.push('Failed moderation');
    }
    if (headline.fakeRisk === 'High') {
      reasons.push('High fake risk');
    }

    return reasons.join(', ');
  }
}

export default PublishingAgent;
