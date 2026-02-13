import EventEmitter from 'events';
import { logger } from '../utils/logger.js';

/**
 * BaseAgent - Foundation for all autonomous agents
 * Each agent operates independently and communicates via events
 * Enhanced with skill system and domain configuration support
 */
export class BaseAgent extends EventEmitter {
  constructor(name, config = {}, domainConfig = null) {
    super();
    this.name = name;
    this.config = config;
    this.domainConfig = domainConfig; // Domain-specific configuration
    this.status = 'idle';

    // Skill system
    this.skills = new Map(); // Registered skills
    this.skillMetrics = new Map(); // Performance tracking per skill

    // Metrics
    this.metrics = {
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      avgProcessingTime: 0,
      lastActivity: null,
      skillExecutions: 0,
      apiCalls: 0,
      costEstimate: 0
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
   * Register a skill with this agent
   * @param {string} skillName - Unique skill identifier
   * @param {Function} handler - Skill execution function
   * @param {Object} options - Optional skill configuration
   */
  registerSkill(skillName, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error(`Skill handler for ${skillName} must be a function`);
    }

    this.skills.set(skillName, {
      name: skillName,
      handler,
      enabled: options.enabled !== false,
      priority: options.priority || 0,
      timeout: options.timeout || 30000,
      retryable: options.retryable !== false,
      cache: options.cache || false
    });

    // Initialize skill metrics
    this.skillMetrics.set(skillName, {
      executions: 0,
      successes: 0,
      failures: 0,
      avgDuration: 0,
      lastExecuted: null
    });

    logger.debug(`[${this.name}] Registered skill: ${skillName}`);
  }

  /**
   * Check if agent has a specific skill
   * @param {string} skillName - Skill identifier
   * @returns {boolean}
   */
  hasSkill(skillName) {
    const skill = this.skills.get(skillName);
    return skill && skill.enabled;
  }

  /**
   * Execute a specific skill
   * @param {string} skillName - Skill to execute
   * @param {*} input - Input data for the skill
   * @param {Object} options - Execution options
   * @returns {Promise<*>} - Skill execution result
   */
  async executeSkill(skillName, input, options = {}) {
    const skill = this.skills.get(skillName);

    if (!skill) {
      throw new Error(`Skill ${skillName} not found in agent ${this.name}`);
    }

    if (!skill.enabled) {
      logger.warn(`[${this.name}] Skill ${skillName} is disabled, skipping`);
      return null;
    }

    const startTime = Date.now();
    const metrics = this.skillMetrics.get(skillName);

    try {
      logger.debug(`[${this.name}] Executing skill: ${skillName}`);

      // Execute with timeout
      const result = await Promise.race([
        skill.handler.call(this, input, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Skill ${skillName} timeout`)), skill.timeout)
        )
      ]);

      // Update metrics
      const duration = Date.now() - startTime;
      metrics.executions++;
      metrics.successes++;
      metrics.lastExecuted = new Date();
      metrics.avgDuration = ((metrics.avgDuration * (metrics.executions - 1)) + duration) / metrics.executions;

      this.metrics.skillExecutions++;

      logger.debug(`[${this.name}] Skill ${skillName} completed in ${duration}ms`);
      this.emit('skill:executed', { agent: this.name, skill: skillName, duration });

      return result;

    } catch (error) {
      metrics.failures++;
      logger.error(`[${this.name}] Skill ${skillName} failed:`, error.message);

      // Retry if configured
      if (skill.retryable && options.retry !== false) {
        logger.info(`[${this.name}] Retrying skill ${skillName}...`);
        await this.delay(1000);
        return this.executeSkill(skillName, input, { ...options, retry: false });
      }

      throw error;
    }
  }

  /**
   * Execute multiple skills in sequence (skill chaining)
   * @param {Array<string>} skillNames - Array of skill names to execute
   * @param {*} initialInput - Input for first skill
   * @returns {Promise<*>} - Final result after all skills
   */
  async chainSkills(skillNames, initialInput) {
    logger.debug(`[${this.name}] Chaining ${skillNames.length} skills`);

    let result = initialInput;

    for (const skillName of skillNames) {
      result = await this.executeSkill(skillName, result);
    }

    return result;
  }

  /**
   * Execute multiple skills in parallel
   * @param {Array<{skill: string, input: *}>} skillExecutions
   * @returns {Promise<Array<*>>} - Array of results
   */
  async executeSkillsParallel(skillExecutions) {
    logger.debug(`[${this.name}] Executing ${skillExecutions.length} skills in parallel`);

    const promises = skillExecutions.map(({ skill, input }) =>
      this.executeSkill(skill, input).catch(error => ({ error: error.message }))
    );

    return Promise.all(promises);
  }

  /**
   * Get list of all registered skills
   * @returns {Array<Object>} - Array of skill info
   */
  getSkills() {
    return Array.from(this.skills.entries()).map(([name, skill]) => ({
      name,
      enabled: skill.enabled,
      priority: skill.priority,
      metrics: this.skillMetrics.get(name)
    }));
  }

  /**
   * Enable or disable a skill
   * @param {string} skillName - Skill to modify
   * @param {boolean} enabled - Enable/disable
   */
  setSkillEnabled(skillName, enabled) {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.enabled = enabled;
      logger.info(`[${this.name}] Skill ${skillName} ${enabled ? 'enabled' : 'disabled'}`);
    }
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
   * Error handling and recovery with configurable retry
   */
  async handleError(error, task, retryCount = 0) {
    logger.error(`[${this.name}] Handling error:`, error.message);

    // Get retry configuration from config or domain config
    const retryConfig = this.config.retry || this.domainConfig?.agentPipeline?.find(a => a.type === this.name.split('-')[0])?.retry || {
      enabled: true,
      maxAttempts: 3,
      backoffMs: 5000
    };

    // Attempt recovery with exponential backoff
    if (retryConfig.enabled && retryCount < retryConfig.maxAttempts) {
      const backoffDelay = retryConfig.backoffMs * Math.pow(2, retryCount); // Exponential backoff
      logger.info(`[${this.name}] Attempting auto-recovery (attempt ${retryCount + 1}/${retryConfig.maxAttempts}) in ${backoffDelay}ms...`);

      await this.delay(backoffDelay);

      try {
        return await this.processTask(task);
      } catch (retryError) {
        return this.handleError(retryError, task, retryCount + 1);
      }
    } else {
      this.emit('agent:critical:error', { agent: this.name, error, task });
    }
  }

  /**
   * Delay utility for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for monitoring (enhanced with skills)
   */
  getHealth() {
    return {
      agent: this.name,
      status: this.status,
      domain: this.domainConfig?.domainId || 'unknown',
      metrics: this.metrics,
      skills: {
        total: this.skills.size,
        enabled: Array.from(this.skills.values()).filter(s => s.enabled).length,
        list: this.getSkills()
      },
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
