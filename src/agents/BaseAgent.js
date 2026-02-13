import EventEmitter from 'events';
import { logger } from '../utils/logger.js';

/**
 * BaseAgent - Foundation for all autonomous agents
 * Each agent operates independently and communicates via events
 */
export class BaseAgent extends EventEmitter {
  constructor(name, config = {}) {
    super();
    this.name = name;
    this.config = config;
    this.status = 'idle';
    this.metrics = {
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      avgProcessingTime: 0,
      lastActivity: null
    };
  }

  /**
   * Initialize agent - override in subclasses
   */
  async initialize() {
    logger.info(`[${this.name}] Initializing agent...`);
    this.status = 'ready';
    this.emit('agent:ready', { agent: this.name });
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  async execute(task) {
    throw new Error(`execute() must be implemented by ${this.name}`);
  }

  /**
   * Process task with error handling and metrics
   */
  async processTask(task) {
    const startTime = Date.now();
    this.status = 'processing';

    try {
      logger.info(`[${this.name}] Processing task: ${task.id || 'unknown'}`);

      const result = await this.execute(task);

      this.metrics.tasksProcessed++;
      this.metrics.tasksSucceeded++;
      this.metrics.lastActivity = new Date();
      this.updateAvgProcessingTime(Date.now() - startTime);

      this.status = 'ready';
      this.emit('task:completed', { agent: this.name, task, result });

      return { success: true, result, agent: this.name };

    } catch (error) {
      this.metrics.tasksFailed++;
      this.status = 'error';

      logger.error(`[${this.name}] Task failed:`, error);
      this.emit('task:failed', { agent: this.name, task, error: error.message });

      // Auto-recovery attempt
      await this.handleError(error, task);

      return { success: false, error: error.message, agent: this.name };
    }
  }

  /**
   * Autonomous decision making
   */
  async makeDecision(data, criteria) {
    logger.info(`[${this.name}] Making autonomous decision...`);
    // Override in subclasses for agent-specific logic
    return { approved: true, reasoning: 'Default approval' };
  }

  /**
   * Request human approval when needed
   */
  async requestHumanApproval(item, reason) {
    logger.warn(`[${this.name}] Requesting human approval: ${reason}`);

    this.emit('human:approval:required', {
      agent: this.name,
      item,
      reason,
      timestamp: new Date()
    });

    // In real implementation, this would wait for human input
    return new Promise((resolve) => {
      this.once('human:approval:received', (approval) => {
        resolve(approval);
      });
    });
  }

  /**
   * Error handling and recovery
   */
  async handleError(error, task) {
    logger.error(`[${this.name}] Handling error:`, error.message);

    // Attempt recovery
    if (this.config.autoRetry && this.metrics.tasksFailed < 3) {
      logger.info(`[${this.name}] Attempting auto-recovery...`);
      setTimeout(() => this.processTask(task), 5000);
    } else {
      this.emit('agent:critical:error', { agent: this.name, error, task });
    }
  }

  /**
   * Health check for monitoring
   */
  getHealth() {
    return {
      agent: this.name,
      status: this.status,
      metrics: this.metrics,
      uptime: Date.now() - (this.metrics.lastActivity || Date.now())
    };
  }

  /**
   * Update average processing time
   */
  updateAvgProcessingTime(duration) {
    const total = this.metrics.avgProcessingTime * (this.metrics.tasksProcessed - 1) + duration;
    this.metrics.avgProcessingTime = total / this.metrics.tasksProcessed;
  }

  /**
   * Shutdown agent gracefully
   */
  async shutdown() {
    logger.info(`[${this.name}] Shutting down...`);
    this.status = 'shutdown';
    this.emit('agent:shutdown', { agent: this.name });
  }
}
