import { logger } from '../../utils/logger.js';

/**
 * RateLimiting Skill
 * Throttle API calls per agent, exponential backoff on failures, quota management
 */
export class RateLimitingSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'rateLimiting';
    this.requestCounts = new Map(); // Track requests per window
    this.quotas = new Map(); // Quota limits per resource
    this.backoffTimers = new Map(); // Exponential backoff tracking
  }

  /**
   * Execute rate limiting check
   * @param {Object} input - { resource, maxRequests, windowMs, action }
   * @param {Object} options
   * @returns {Promise<Object>} - { allowed, remaining, resetAt, waitMs }
   */
  async execute(input, options = {}) {
    const { resource, maxRequests = 60, windowMs = 60000, action = 'check' } = input;

    switch (action) {
      case 'check':
        return this.checkLimit(resource, maxRequests, windowMs);
      case 'increment':
        return this.incrementCount(resource, maxRequests, windowMs);
      case 'reset':
        return this.resetLimit(resource);
      case 'getStatus':
        return this.getStatus(resource);
      case 'backoff':
        return this.applyBackoff(resource, input.attemptNumber || 0);
      default:
        throw new Error(`Unknown rate limit action: ${action}`);
    }
  }

  /**
   * Check if request is allowed
   * @param {string} resource
   * @param {number} maxRequests
   * @param {number} windowMs
   * @returns {Object}
   */
  checkLimit(resource, maxRequests, windowMs) {
    const now = Date.now();
    const key = `${resource}:${Math.floor(now / windowMs)}`;

    const count = this.requestCounts.get(key) || 0;
    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = new Date(Math.ceil(now / windowMs) * windowMs);

    if (!allowed) {
      logger.warn(`[${this.agent.name}] Rate limit exceeded for ${resource}: ${count}/${maxRequests}`);
    }

    return {
      allowed,
      remaining,
      resetAt,
      waitMs: allowed ? 0 : resetAt - now
    };
  }

  /**
   * Increment request count
   * @param {string} resource
   * @param {number} maxRequests
   * @param {number} windowMs
   * @returns {Object}
   */
  incrementCount(resource, maxRequests, windowMs) {
    const now = Date.now();
    const key = `${resource}:${Math.floor(now / windowMs)}`;

    const count = (this.requestCounts.get(key) || 0) + 1;
    this.requestCounts.set(key, count);

    // Clean up old windows (older than 2 windows)
    this.cleanup(now, windowMs);

    return this.checkLimit(resource, maxRequests, windowMs);
  }

  /**
   * Reset limit for a resource
   * @param {string} resource
   * @returns {boolean}
   */
  resetLimit(resource) {
    const keysToDelete = Array.from(this.requestCounts.keys())
      .filter(key => key.startsWith(`${resource}:`));

    for (const key of keysToDelete) {
      this.requestCounts.delete(key);
    }

    logger.info(`[${this.agent.name}] Reset rate limit for ${resource}`);
    return true;
  }

  /**
   * Get status for a resource
   * @param {string} resource
   * @returns {Object}
   */
  getStatus(resource) {
    const now = Date.now();
    const stats = {};

    for (const [key, count] of this.requestCounts.entries()) {
      if (key.startsWith(`${resource}:`)) {
        stats[key] = count;
      }
    }

    const backoff = this.backoffTimers.get(resource);

    return {
      resource,
      windows: stats,
      backoff: backoff ? {
        active: true,
        expiresAt: backoff.expiresAt,
        attemptNumber: backoff.attemptNumber
      } : { active: false }
    };
  }

  /**
   * Apply exponential backoff
   * @param {string} resource
   * @param {number} attemptNumber
   * @returns {Promise<Object>}
   */
  async applyBackoff(resource, attemptNumber) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);

    const expiresAt = Date.now() + delay;

    this.backoffTimers.set(resource, {
      attemptNumber,
      expiresAt
    });

    logger.warn(`[${this.agent.name}] Applying backoff for ${resource}: ${delay}ms (attempt ${attemptNumber})`);

    // Wait for backoff period
    await this.delay(delay);

    this.backoffTimers.delete(resource);

    return {
      backoffApplied: true,
      delayMs: delay,
      attemptNumber
    };
  }

  /**
   * Check if resource is in backoff period
   * @param {string} resource
   * @returns {boolean}
   */
  isInBackoff(resource) {
    const backoff = this.backoffTimers.get(resource);
    if (!backoff) return false;

    if (Date.now() >= backoff.expiresAt) {
      this.backoffTimers.delete(resource);
      return false;
    }

    return true;
  }

  /**
   * Clean up old request counts
   * @param {number} now
   * @param {number} windowMs
   * @returns {void}
   */
  cleanup(now, windowMs) {
    const currentWindow = Math.floor(now / windowMs);
    const keysToDelete = [];

    for (const key of this.requestCounts.keys()) {
      const [_, windowStr] = key.split(':');
      const window = parseInt(windowStr);

      if (window < currentWindow - 1) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.requestCounts.delete(key);
    }
  }

  /**
   * Delay utility
   * @param {number} ms
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all rate limit stats
   * @returns {Object}
   */
  getAllStats() {
    return {
      totalResources: new Set(Array.from(this.requestCounts.keys()).map(k => k.split(':')[0])).size,
      activeWindows: this.requestCounts.size,
      activeBackoffs: this.backoffTimers.size,
      resources: Array.from(new Set(Array.from(this.requestCounts.keys()).map(k => k.split(':')[0])))
    };
  }
}

export default RateLimitingSkill;
