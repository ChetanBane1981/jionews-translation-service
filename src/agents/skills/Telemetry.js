import { logger } from '../../utils/logger.js';

/**
 * Telemetry Skill
 * Detailed performance metrics, cost tracking, success/failure patterns
 */
export class TelemetrySkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'telemetry';
    this.metrics = {
      operations: new Map(),
      costs: [],
      performance: [],
      errors: []
    };
    this.startTime = Date.now();
  }

  /**
   * Execute telemetry operation
   * @param {Object} input - { action, data }
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async execute(input, options = {}) {
    const { action, data } = input;

    switch (action) {
      case 'track':
        return this.track(data);
      case 'trackPerformance':
        return this.trackPerformance(data);
      case 'trackCost':
        return this.trackCost(data);
      case 'trackError':
        return this.trackError(data);
      case 'getMetrics':
        return this.getMetrics(data?.filter);
      case 'reset':
        return this.reset();
      default:
        throw new Error(`Unknown telemetry action: ${action}`);
    }
  }

  /**
   * Track generic operation
   * @param {Object} data - { operation, duration, success, metadata }
   * @returns {Object}
   */
  track(data) {
    const { operation, duration, success, metadata = {} } = data;

    if (!this.metrics.operations.has(operation)) {
      this.metrics.operations.set(operation, {
        count: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      });
    }

    const opMetrics = this.metrics.operations.get(operation);
    opMetrics.count++;

    if (success) {
      opMetrics.successes++;
    } else {
      opMetrics.failures++;
    }

    if (duration !== undefined) {
      opMetrics.totalDuration += duration;
      opMetrics.avgDuration = opMetrics.totalDuration / opMetrics.count;
      opMetrics.minDuration = Math.min(opMetrics.minDuration, duration);
      opMetrics.maxDuration = Math.max(opMetrics.maxDuration, duration);
    }

    logger.debug(`[${this.agent.name}] Tracked operation: ${operation} (${duration}ms, ${success ? 'success' : 'failure'})`);

    return {
      operation,
      metrics: opMetrics
    };
  }

  /**
   * Track performance metrics
   * @param {Object} data - { operation, startTime, endTime, metadata }
   * @returns {Object}
   */
  trackPerformance(data) {
    const { operation, startTime, endTime, metadata = {} } = data;
    const duration = endTime - startTime;

    this.metrics.performance.push({
      operation,
      duration,
      timestamp: new Date(endTime),
      metadata
    });

    // Keep only last 1000 performance entries
    if (this.metrics.performance.length > 1000) {
      this.metrics.performance = this.metrics.performance.slice(-1000);
    }

    // Also track in operations map
    this.track({
      operation,
      duration,
      success: true,
      metadata
    });

    return {
      operation,
      duration,
      percentile95: this.calculatePercentile(operation, 95),
      percentile99: this.calculatePercentile(operation, 99)
    };
  }

  /**
   * Track cost (API calls, resources)
   * @param {Object} data - { operation, cost, currency, metadata }
   * @returns {Object}
   */
  trackCost(data) {
    const { operation, cost, currency = 'USD', metadata = {} } = data;

    this.metrics.costs.push({
      operation,
      cost,
      currency,
      timestamp: new Date(),
      metadata
    });

    // Keep only last 10000 cost entries
    if (this.metrics.costs.length > 10000) {
      this.metrics.costs = this.metrics.costs.slice(-10000);
    }

    logger.debug(`[${this.agent.name}] Tracked cost: ${operation} - ${cost} ${currency}`);

    return {
      operation,
      cost,
      totalCost: this.getTotalCost()
    };
  }

  /**
   * Track error
   * @param {Object} data - { operation, error, severity, metadata }
   * @returns {Object}
   */
  trackError(data) {
    const { operation, error, severity = 'error', metadata = {} } = data;

    this.metrics.errors.push({
      operation,
      error: error.message || String(error),
      severity,
      timestamp: new Date(),
      metadata
    });

    // Keep only last 500 errors
    if (this.metrics.errors.length > 500) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }

    // Also track in operations map
    this.track({
      operation,
      success: false,
      metadata
    });

    logger.error(`[${this.agent.name}] Tracked error: ${operation} - ${error.message || error}`);

    return {
      operation,
      errorCount: this.getErrorCount(operation),
      errorRate: this.getErrorRate(operation)
    };
  }

  /**
   * Get metrics (optionally filtered)
   * @param {string} filter - Operation name to filter by
   * @returns {Object}
   */
  getMetrics(filter = null) {
    const uptime = Date.now() - this.startTime;

    const metrics = {
      agent: this.agent.name,
      uptime: {
        ms: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      operations: {},
      costs: {
        total: this.getTotalCost(),
        byOperation: this.getCostsByOperation()
      },
      errors: {
        total: this.metrics.errors.length,
        byOperation: this.getErrorsByOperation(),
        recent: this.metrics.errors.slice(-10)
      },
      performance: {
        operations: this.metrics.operations.size,
        totalTracked: this.metrics.performance.length
      }
    };

    // Add operation-specific metrics
    if (filter) {
      const opMetrics = this.metrics.operations.get(filter);
      if (opMetrics) {
        metrics.operations[filter] = {
          ...opMetrics,
          successRate: (opMetrics.successes / opMetrics.count) * 100,
          failureRate: (opMetrics.failures / opMetrics.count) * 100
        };
      }
    } else {
      // Add all operations
      for (const [operation, opMetrics] of this.metrics.operations.entries()) {
        metrics.operations[operation] = {
          ...opMetrics,
          successRate: (opMetrics.successes / opMetrics.count) * 100,
          failureRate: (opMetrics.failures / opMetrics.count) * 100
        };
      }
    }

    return metrics;
  }

  /**
   * Get total cost
   * @returns {number}
   */
  getTotalCost() {
    return this.metrics.costs.reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * Get costs by operation
   * @returns {Object}
   */
  getCostsByOperation() {
    const costs = {};

    this.metrics.costs.forEach(entry => {
      if (!costs[entry.operation]) {
        costs[entry.operation] = 0;
      }
      costs[entry.operation] += entry.cost;
    });

    return costs;
  }

  /**
   * Get error count for operation
   * @param {string} operation
   * @returns {number}
   */
  getErrorCount(operation) {
    return this.metrics.errors.filter(e => e.operation === operation).length;
  }

  /**
   * Get error rate for operation
   * @param {string} operation
   * @returns {number}
   */
  getErrorRate(operation) {
    const opMetrics = this.metrics.operations.get(operation);
    if (!opMetrics || opMetrics.count === 0) return 0;

    return (opMetrics.failures / opMetrics.count) * 100;
  }

  /**
   * Get errors grouped by operation
   * @returns {Object}
   */
  getErrorsByOperation() {
    const errors = {};

    this.metrics.errors.forEach(entry => {
      if (!errors[entry.operation]) {
        errors[entry.operation] = 0;
      }
      errors[entry.operation]++;
    });

    return errors;
  }

  /**
   * Calculate performance percentile
   * @param {string} operation
   * @param {number} percentile
   * @returns {number}
   */
  calculatePercentile(operation, percentile) {
    const durations = this.metrics.performance
      .filter(p => p.operation === operation)
      .map(p => p.duration)
      .sort((a, b) => a - b);

    if (durations.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * durations.length) - 1;
    return durations[index];
  }

  /**
   * Reset all metrics
   * @returns {Object}
   */
  reset() {
    const oldMetrics = this.getMetrics();

    this.metrics = {
      operations: new Map(),
      costs: [],
      performance: [],
      errors: []
    };
    this.startTime = Date.now();

    logger.info(`[${this.agent.name}] Telemetry reset`);

    return {
      reset: true,
      previousMetrics: oldMetrics
    };
  }

  /**
   * Export metrics for external monitoring
   * @returns {Object}
   */
  exportMetrics() {
    return {
      agent: this.agent.name,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics()
    };
  }
}

export default TelemetrySkill;
