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
 * Central Orchestrator - Generic Content Processing Engine
 * Manages all autonomous agents based on domain configuration
 * Supports: news, ecommerce, social media, and custom domains
 */
export class Orchestrator extends EventEmitter {
  constructor(domainConfig = null) {
    super();
    this.domainConfig = domainConfig; // Domain-specific configuration
    this.agents = new Map();
    this.pipeline = [];
    this.humanApprovalQueue = [];
    this.isRunning = false;
    this.agentRegistry = this.createAgentRegistry(); // Available agent constructors
  }

  /**
   * Create registry of available agent types
   * Maps agent type names to their constructors
   */
  createAgentRegistry() {
    return {
      'feed': FeedAgent,
      'detection': DetectionAgent,
      'cluster': ClusterAgent,
      'moderation': ModerationAgent,
      'credibility': CredibilityAgent,
      'summary': SummaryAgent,
      'translation': TranslationAgent,
      'ranking': RankingAgent,
      'personalization': PersonalizationAgent,
      'publishing': PublishingAgent
    };
  }

  /**
   * Initialize all agents based on domain configuration
   */
  async initialize() {
    const domain = this.domainConfig?.domainId || 'unknown';
    logger.info(`[Orchestrator] Initializing for domain: ${domain}...`);

    // If no domain config provided, use default news pipeline
    if (!this.domainConfig) {
      logger.warn('[Orchestrator] No domain config provided, using default news pipeline');
      this.initializeDefaultPipeline();
    } else {
      this.initializeFromDomainConfig();
    }

    // Initialize all agents
    for (const [name, agent] of this.agents) {
      await agent.initialize();
      this.setupAgentListeners(name, agent);
    }

    // Define pipeline from registered agents
    this.definePipeline();

    logger.info(`[Orchestrator] ${this.agents.size} agents initialized and ready`);
    this.isRunning = true;
    this.emit('orchestrator:ready', { domain, agentCount: this.agents.size });
  }

  /**
   * Initialize agents from domain configuration
   */
  initializeFromDomainConfig() {
    if (!this.domainConfig.agentPipeline) {
      logger.error('[Orchestrator] Domain config missing agentPipeline');
      this.initializeDefaultPipeline();
      return;
    }

    const enabledAgents = this.domainConfig.agentPipeline
      .filter(agentDef => agentDef.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    logger.info(`[Orchestrator] Loading ${enabledAgents.length} agents from domain config`);

    for (const agentDef of enabledAgents) {
      const AgentClass = this.agentRegistry[agentDef.type];

      if (!AgentClass) {
        logger.warn(`[Orchestrator] Unknown agent type: ${agentDef.type}, skipping`);
        continue;
      }

      // Create agent instance with config and domain config
      const agentName = agentDef.name || agentDef.type;
      const agentInstance = new AgentClass(agentDef.config, this.domainConfig);

      // Register skills if specified
      if (agentDef.skills && Array.isArray(agentDef.skills)) {
        logger.debug(`[Orchestrator] Agent ${agentName} will use skills: ${agentDef.skills.join(', ')}`);
        // Skills will be registered when agent initializes
      }

      this.registerAgent(agentName, agentInstance, agentDef);
    }
  }

  /**
   * Initialize default news pipeline (backward compatibility)
   */
  initializeDefaultPipeline() {
    logger.info('[Orchestrator] Initializing default news pipeline...');

    const defaultConfig = {
      domain: 'news',
      thresholds: {
        credibilityMin: 70,
        autoPublishMin: 80
      }
    };

    // Register all agents with default config
    this.registerAgent('feed', new FeedAgent({}, defaultConfig));
    this.registerAgent('detection', new DetectionAgent({}, defaultConfig));
    this.registerAgent('cluster', new ClusterAgent({}, defaultConfig));
    this.registerAgent('moderation', new ModerationAgent({}, defaultConfig));
    this.registerAgent('credibility', new CredibilityAgent({}, defaultConfig));
    this.registerAgent('summary', new SummaryAgent({}, defaultConfig));
    this.registerAgent('translation', new TranslationAgent({}, defaultConfig));
    this.registerAgent('ranking', new RankingAgent({}, defaultConfig));
    this.registerAgent('personalization', new PersonalizationAgent({}, defaultConfig));
    this.registerAgent('publishing', new PublishingAgent({}, defaultConfig));
  }

  /**
   * Register an agent with metadata
   * @param {string} name - Agent name
   * @param {Object} agent - Agent instance
   * @param {Object} metadata - Agent metadata (order, parallelizable, etc.)
   */
  registerAgent(name, agent, metadata = {}) {
    this.agents.set(name, {
      instance: agent,
      name,
      order: metadata.order || 0,
      parallelizable: metadata.parallelizable || false,
      enabled: metadata.enabled !== false
    });
    logger.info(`[Orchestrator] Registered agent: ${name} (order: ${metadata.order || 0})`);
  }

  /**
   * Setup event listeners for each agent
   */
  setupAgentListeners(name, agentWrapper) {
    const agent = agentWrapper.instance;

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

    agent.on('skill:executed', (data) => {
      logger.debug(`[Orchestrator] Agent ${name} executed skill: ${data.skill}`);
    });
  }

  /**
   * Define the pipeline flow from registered agents
   * Respects agent order and parallelization settings
   */
  definePipeline() {
    // Sort agents by order
    const sortedAgents = Array.from(this.agents.entries())
      .filter(([_, agentWrapper]) => agentWrapper.enabled)
      .sort(([_, a], [__, b]) => a.order - b.order);

    // Build pipeline (just names for now, can be enhanced with parallel execution)
    this.pipeline = sortedAgents.map(([name, _]) => name);

    logger.info('[Orchestrator] Pipeline defined:', this.pipeline);
  }

  /**
   * Start the autonomous processing pipeline
   */
  async start() {
    if (!this.isRunning) {
      await this.initialize();
    }

    const domain = this.domainConfig?.domainId || 'default';
    logger.info(`[Orchestrator] Starting autonomous pipeline for domain: ${domain}...`);

    // Start feed agent (continuous polling) if available
    const feedAgentWrapper = this.agents.get('feed');
    if (feedAgentWrapper && feedAgentWrapper.instance.startContinuousIngestion) {
      await feedAgentWrapper.instance.startContinuousIngestion();
    }

    this.emit('orchestrator:started', { domain });
  }

  /**
   * Process content item through the entire pipeline
   * Generic - works for any content type (news, products, social posts, etc.)
   */
  async processThroughPipeline(contentItem) {
    const itemId = contentItem.id || 'unknown';
    const itemType = contentItem.type || 'unknown';

    logger.info(`[Orchestrator] Processing ${itemType} item: ${itemId}`);

    let currentData = contentItem;
    const startTime = Date.now();

    for (const agentName of this.pipeline) {
      const agentWrapper = this.agents.get(agentName);

      if (!agentWrapper || !agentWrapper.enabled) {
        logger.warn(`[Orchestrator] Agent not found or disabled: ${agentName}, skipping`);
        continue;
      }

      const agent = agentWrapper.instance;

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

    const processingTime = Date.now() - startTime;
    logger.info(`[Orchestrator] Pipeline completed successfully for: ${itemId} in ${processingTime}ms`);
    this.emit('pipeline:completed', { data: currentData, processingTime });

    return { success: true, data: currentData, processingTime };
  }

  /**
   * Process multiple items in parallel (batch processing)
   * @param {Array} items - Array of content items
   * @returns {Promise<Array>}
   */
  async processBatch(items) {
    logger.info(`[Orchestrator] Processing batch of ${items.length} items`);

    const promises = items.map(item =>
      this.processThroughPipeline(item).catch(error => ({
        success: false,
        error: error.message,
        itemId: item.id
      }))
    );

    return Promise.all(promises);
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
   * Get system health status (enhanced with domain info)
   */
  getSystemHealth() {
    const health = {
      orchestrator: this.isRunning ? 'running' : 'stopped',
      domain: this.domainConfig?.domainId || 'unknown',
      domainName: this.domainConfig?.name || 'Unknown Domain',
      agents: {},
      pipeline: this.pipeline,
      humanApprovalQueue: this.humanApprovalQueue.length,
      agentCount: this.agents.size
    };

    for (const [name, agentWrapper] of this.agents) {
      if (agentWrapper.enabled && agentWrapper.instance) {
        health.agents[name] = agentWrapper.instance.getHealth();
      }
    }

    return health;
  }

  /**
   * Get agent by name
   * @param {string} name - Agent name
   * @returns {Object|null} - Agent instance or null
   */
  getAgent(name) {
    const agentWrapper = this.agents.get(name);
    return agentWrapper?.instance || null;
  }

  /**
   * Shutdown orchestrator and all agents
   */
  async shutdown() {
    logger.info('[Orchestrator] Shutting down...');

    for (const [name, agentWrapper] of this.agents) {
      if (agentWrapper.instance && agentWrapper.instance.shutdown) {
        await agentWrapper.instance.shutdown();
      }
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
