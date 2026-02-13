import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import { FeedAgent } from '../agents/feed-agent.js';
import { DetectionAgent } from '../agents/detection-agent.js';
import { CredibilityAgent } from '../agents/credibility-agent.js';
import { ClusterAgent } from '../agents/cluster-agent.js';
import { ModerationAgent } from '../agents/moderation-agent.js';
import { SummaryAgent } from '../agents/summary-agent.js';
import { TranslationAgent } from '../agents/translation-agent.js';
import { RankingAgent } from '../agents/ranking-agent.js';
import { PersonalizationAgent } from '../agents/personalization-agent.js';
import { PublishingAgent } from '../agents/publishing-agent.js';

/**
 * Central Orchestrator - Claude's Brain
 * Manages all autonomous agents in the newsroom pipeline
 */
export class Orchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.pipeline = [];
    this.humanApprovalQueue = [];
    this.isRunning = false;
  }

  /**
   * Initialize all agents
   */
  async initialize() {
    logger.info('[Orchestrator] Initializing autonomous newsroom...');

    // Register all agents
    this.registerAgent('feed', new FeedAgent());
    this.registerAgent('detection', new DetectionAgent());
    this.registerAgent('cluster', new ClusterAgent());
    this.registerAgent('moderation', new ModerationAgent());
    this.registerAgent('credibility', new CredibilityAgent());
    this.registerAgent('summary', new SummaryAgent());
    this.registerAgent('translation', new TranslationAgent());
    this.registerAgent('ranking', new RankingAgent());
    this.registerAgent('personalization', new PersonalizationAgent());
    this.registerAgent('publishing', new PublishingAgent());

    // Initialize all agents
    for (const [name, agent] of this.agents) {
      await agent.initialize();
      this.setupAgentListeners(name, agent);
    }

    // Define autonomous pipeline flow
    this.definePipeline();

    logger.info('[Orchestrator] All agents initialized and ready');
    this.isRunning = true;
    this.emit('orchestrator:ready');
  }

  /**
   * Register an agent
   */
  registerAgent(name, agent) {
    this.agents.set(name, agent);
    logger.info(`[Orchestrator] Registered agent: ${name}`);
  }

  /**
   * Setup event listeners for each agent
   */
  setupAgentListeners(name, agent) {
    agent.on('task:completed', (data) => {
      logger.info(`[Orchestrator] Agent ${name} completed task`);
      this.onAgentTaskComplete(name, data);
    });

    agent.on('task:failed', (data) => {
      logger.error(`[Orchestrator] Agent ${name} failed task`);
      this.onAgentTaskFailed(name, data);
    });

    agent.on('human:approval:required', (data) => {
      this.handleHumanApprovalRequest(data);
    });

    agent.on('agent:critical:error', (data) => {
      this.handleCriticalError(data);
    });
  }

  /**
   * Define the autonomous pipeline flow
   */
  definePipeline() {
    this.pipeline = [
      'feed',           // 1. Ingest news feeds
      'detection',      // 2. Detect breaking news
      'cluster',        // 3. Deduplicate & cluster
      'moderation',     // 4. Apply filtration rules
      'credibility',    // 5. Score credibility & fake risk
      'summary',        // 6. Generate summaries
      'translation',    // 7. Translate to multiple languages
      'ranking',        // 8. Rank and detect trending
      'personalization',// 9. Personalize for user segments
      'publishing'      // 10. Auto-publish or request approval
    ];
    logger.info('[Orchestrator] Pipeline defined:', this.pipeline);
  }

  /**
   * Start the autonomous newsroom
   */
  async start() {
    if (!this.isRunning) {
      await this.initialize();
    }

    logger.info('[Orchestrator] Starting autonomous newsroom pipeline...');

    // Start feed agent (continuous polling)
    const feedAgent = this.agents.get('feed');
    await feedAgent.startContinuousIngestion();

    this.emit('orchestrator:started');
  }

  /**
   * Process news item through the entire pipeline
   */
  async processThroughPipeline(newsItem) {
    logger.info(`[Orchestrator] Processing news item: ${newsItem.id}`);

    let currentData = newsItem;

    for (const agentName of this.pipeline) {
      const agent = this.agents.get(agentName);

      if (!agent) {
        logger.error(`[Orchestrator] Agent not found: ${agentName}`);
        continue;
      }

      // Process through agent
      const result = await agent.processTask(currentData);

      if (!result.success) {
        logger.error(`[Orchestrator] Pipeline failed at ${agentName}`);
        return { success: false, failedAt: agentName, error: result.error };
      }

      // Check if human approval is needed
      if (result.requiresApproval) {
        logger.warn(`[Orchestrator] Human approval required at ${agentName}`);
        const approval = await this.requestHumanApproval(result, agentName);

        if (!approval.approved) {
          logger.info(`[Orchestrator] Item rejected by human supervisor`);
          return { success: false, rejected: true, reason: approval.reason };
        }
      }

      // Update data for next agent
      currentData = { ...currentData, ...result.result };
    }

    logger.info(`[Orchestrator] Pipeline completed successfully for: ${newsItem.id}`);
    this.emit('pipeline:completed', currentData);

    return { success: true, data: currentData };
  }

  /**
   * Handle agent task completion
   */
  onAgentTaskComplete(agentName, data) {
    // Auto-trigger next agent in pipeline if needed
    const currentIndex = this.pipeline.indexOf(agentName);
    if (currentIndex !== -1 && currentIndex < this.pipeline.length - 1) {
      const nextAgent = this.pipeline[currentIndex + 1];
      logger.info(`[Orchestrator] Auto-triggering next agent: ${nextAgent}`);
    }
  }

  /**
   * Handle agent task failure
   */
  onAgentTaskFailed(agentName, data) {
    // Autonomous recovery logic
    logger.error(`[Orchestrator] Initiating recovery for ${agentName}`);
    this.emit('recovery:initiated', { agent: agentName, data });
  }

  /**
   * Request human approval (only when necessary)
   */
  async requestHumanApproval(data, agentName) {
    logger.warn(`[Orchestrator] HUMAN APPROVAL REQUIRED at ${agentName}`);

    this.humanApprovalQueue.push({
      id: Date.now(),
      agent: agentName,
      data,
      timestamp: new Date()
    });

    this.emit('human:approval:needed', {
      agent: agentName,
      data,
      queueLength: this.humanApprovalQueue.length
    });

    // In production, this would integrate with UI
    // For now, return auto-approval with reasoning
    return {
      approved: true,
      reason: 'Auto-approved for demo (implement human UI)'
    };
  }

  /**
   * Handle critical errors
   */
  handleCriticalError(data) {
    logger.error('[Orchestrator] CRITICAL ERROR:', data);
    this.emit('critical:error', data);

    // Alert human supervisor
    // In production: send email, Slack notification, etc.
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    const health = {
      orchestrator: 'running',
      agents: {},
      pipeline: this.pipeline,
      humanApprovalQueue: this.humanApprovalQueue.length
    };

    for (const [name, agent] of this.agents) {
      health.agents[name] = agent.getHealth();
    }

    return health;
  }

  /**
   * Shutdown orchestrator and all agents
   */
  async shutdown() {
    logger.info('[Orchestrator] Shutting down...');

    for (const [name, agent] of this.agents) {
      await agent.shutdown();
    }

    this.isRunning = false;
    this.emit('orchestrator:shutdown');
  }
}

// Start orchestrator if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new Orchestrator();

  orchestrator.start().catch((error) => {
    logger.error('Failed to start orchestrator:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });
}

export default Orchestrator;
