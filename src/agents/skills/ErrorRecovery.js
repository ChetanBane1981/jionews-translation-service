import { logger } from '../../utils/logger.js';

/**
 * ErrorRecovery Skill
 * Smart retry with exponential backoff, fallback strategies, partial success handling
 */
export class ErrorRecoverySkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'errorRecovery';
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
  }

  /**
   * Execute error recovery
   * @param {Object} input - { error, operation, context, strategy }
   * @param {Object} options - { maxRetries, backoffMs, fallback }
   * @returns {Promise<Object>} - { recovered, result, strategy, attempts }
   */
  async execute(input, options = {}) {
    const {
      error,
      operation,
      context = {},
      strategy = 'auto'
    } = input;

    const {
      maxRetries = 3,
      backoffMs = 1000,
      fallback = null
    } = options;

    logger.warn(`[${this.agent.name}] Attempting error recovery for operation: ${operation}`);

    // Record error
    this.recordError(error, operation, context);

    // Determine recovery strategy
    const recoveryStrategy = strategy === 'auto'
      ? this.selectStrategy(error, operation)
      : strategy;

    logger.info(`[${this.agent.name}] Using recovery strategy: ${recoveryStrategy}`);

    // Execute recovery
    try {
      const result = await this.executeStrategy(
        recoveryStrategy,
        error,
        operation,
        context,
        { maxRetries, backoffMs, fallback }
      );

      return {
        recovered: true,
        result,
        strategy: recoveryStrategy,
        attempts: context.attemptNumber || 1
      };

    } catch (recoveryError) {
      logger.error(`[${this.agent.name}] Recovery failed:`, recoveryError.message);

      return {
        recovered: false,
        error: recoveryError.message,
        strategy: recoveryStrategy,
        attempts: maxRetries
      };
    }
  }

  /**
   * Select appropriate recovery strategy based on error type
   * @param {Error} error
   * @param {string} operation
   * @returns {string}
   */
  selectStrategy(error, operation) {
    const errorMessage = error.message.toLowerCase();

    // Network errors -> retry with backoff
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('econnrefused')) {
      return 'retry_backoff';
    }

    // Rate limit errors -> wait and retry
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      return 'rate_limit_backoff';
    }

    // Authentication errors -> refresh and retry
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('401')) {
      return 'refresh_auth';
    }

    // Data validation errors -> fix and retry
    if (errorMessage.includes('validation') ||
        errorMessage.includes('invalid')) {
      return 'fix_and_retry';
    }

    // Partial success errors -> continue with succeeded parts
    if (errorMessage.includes('partial')) {
      return 'partial_success';
    }

    // Default: simple retry
    return 'retry';
  }

  /**
   * Execute recovery strategy
   * @param {string} strategy
   * @param {Error} error
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async executeStrategy(strategy, error, operation, context, options) {
    switch (strategy) {
      case 'retry':
        return this.retrySimple(operation, context, options.maxRetries);

      case 'retry_backoff':
        return this.retryWithBackoff(operation, context, options);

      case 'rate_limit_backoff':
        return this.retryRateLimitBackoff(operation, context, options);

      case 'refresh_auth':
        return this.refreshAndRetry(operation, context, options);

      case 'fix_and_retry':
        return this.fixDataAndRetry(operation, context, options);

      case 'partial_success':
        return this.handlePartialSuccess(operation, context, options);

      case 'fallback':
        return this.useFallback(operation, context, options.fallback);

      case 'skip':
        logger.warn(`[${this.agent.name}] Skipping operation ${operation} due to irrecoverable error`);
        return null;

      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  /**
   * Simple retry without backoff
   * @param {string} operation
   * @param {Object} context
   * @param {number} maxRetries
   * @returns {Promise<*>}
   */
  async retrySimple(operation, context, maxRetries) {
    for (let i = 1; i <= maxRetries; i++) {
      try {
        logger.info(`[${this.agent.name}] Retry attempt ${i}/${maxRetries}`);
        return await this.executeOperation(operation, context);
      } catch (error) {
        if (i === maxRetries) throw error;
        await this.delay(1000);
      }
    }
  }

  /**
   * Retry with exponential backoff
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async retryWithBackoff(operation, context, options) {
    const { maxRetries, backoffMs } = options;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        logger.info(`[${this.agent.name}] Retry with backoff attempt ${i}/${maxRetries}`);
        return await this.executeOperation(operation, context);
      } catch (error) {
        if (i === maxRetries) throw error;

        const delay = backoffMs * Math.pow(2, i - 1);
        logger.info(`[${this.agent.name}] Backing off for ${delay}ms`);
        await this.delay(delay);
      }
    }
  }

  /**
   * Retry with rate limit specific backoff
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async retryRateLimitBackoff(operation, context, options) {
    // Wait longer for rate limits (start at 5 seconds)
    const rateLimitBackoff = options.backoffMs * 5;

    logger.info(`[${this.agent.name}] Rate limit detected, waiting ${rateLimitBackoff}ms`);
    await this.delay(rateLimitBackoff);

    return this.retryWithBackoff(operation, context, {
      ...options,
      backoffMs: rateLimitBackoff
    });
  }

  /**
   * Refresh authentication and retry
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async refreshAndRetry(operation, context, options) {
    logger.info(`[${this.agent.name}] Refreshing authentication...`);

    // Placeholder: would refresh API keys/tokens in production
    await this.delay(1000);

    return this.retrySimple(operation, context, options.maxRetries);
  }

  /**
   * Fix validation issues and retry
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async fixDataAndRetry(operation, context, options) {
    logger.info(`[${this.agent.name}] Attempting to fix validation issues...`);

    // Sanitize/fix common data issues
    if (context.data) {
      context.data = this.sanitizeData(context.data);
    }

    return this.retrySimple(operation, context, options.maxRetries);
  }

  /**
   * Handle partial success (some items succeeded, some failed)
   * @param {string} operation
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async handlePartialSuccess(operation, context, options) {
    logger.info(`[${this.agent.name}] Handling partial success...`);

    // Return successful results, log failures
    if (context.results) {
      const succeeded = context.results.filter(r => r.success);
      const failed = context.results.filter(r => !r.success);

      logger.warn(`[${this.agent.name}] Partial success: ${succeeded.length} succeeded, ${failed.length} failed`);

      return {
        partialSuccess: true,
        succeeded,
        failed
      };
    }

    return null;
  }

  /**
   * Use fallback method
   * @param {string} operation
   * @param {Object} context
   * @param {Function} fallback
   * @returns {Promise<*>}
   */
  async useFallback(operation, context, fallback) {
    if (!fallback) {
      throw new Error('No fallback provided');
    }

    logger.info(`[${this.agent.name}] Using fallback method...`);

    if (typeof fallback === 'function') {
      return await fallback(context);
    }

    return fallback;
  }

  /**
   * Execute operation (placeholder)
   * @param {string} operation
   * @param {Object} context
   * @returns {Promise<*>}
   */
  async executeOperation(operation, context) {
    // In production, this would actually re-execute the failed operation
    // For now, return context data
    return context.data || {};
  }

  /**
   * Sanitize data to fix common issues
   * @param {Object} data
   * @returns {Object}
   */
  sanitizeData(data) {
    const sanitized = { ...data };

    // Remove null/undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    // Trim strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();
      }
    });

    return sanitized;
  }

  /**
   * Record error for pattern analysis
   * @param {Error} error
   * @param {string} operation
   * @param {Object} context
   * @returns {void}
   */
  recordError(error, operation, context) {
    this.errorHistory.push({
      error: error.message,
      operation,
      context: { ...context, data: undefined }, // Don't store large data
      timestamp: new Date()
    });

    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
  }

  /**
   * Get error statistics
   * @returns {Object}
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorHistory.length,
      byOperation: {},
      recentErrors: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(entry => {
      stats.byOperation[entry.operation] = (stats.byOperation[entry.operation] || 0) + 1;
    });

    return stats;
  }

  /**
   * Delay utility
   * @param {number} ms
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ErrorRecoverySkill;
