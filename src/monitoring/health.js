import { database } from '../utils/database.js';
import { queueManager } from '../services/queue.js';
import { logger } from '../utils/logger.js';
import os from 'os';

/**
 * Health Monitoring System
 */
class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
    logger.info(`[HealthMonitor] Registered health check: ${name}`);
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks: {}
    };

    // Database check
    try {
      const dbHealth = await database.healthCheck();
      results.checks.database = dbHealth;
      if (!dbHealth.healthy) results.status = 'unhealthy';
    } catch (error) {
      results.checks.database = { healthy: false, error: error.message };
      results.status = 'unhealthy';
    }

    // Queue check
    try {
      const queueHealth = await queueManager.healthCheck();
      results.checks.queue = queueHealth;
      if (!queueHealth.healthy) results.status = 'degraded';
    } catch (error) {
      results.checks.queue = { healthy: false, error: error.message };
      results.status = 'degraded';
    }

    // System resources
    results.checks.system = this.getSystemHealth();

    // Custom checks
    for (const [name, checkFn] of this.checks) {
      try {
        results.checks[name] = await checkFn();
      } catch (error) {
        results.checks[name] = { healthy: false, error: error.message };
        results.status = 'degraded';
      }
    }

    return results;
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      healthy: true,
      cpu: {
        cores: os.cpus().length,
        loadAvg: os.loadavg()
      },
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      platform: os.platform(),
      nodeVersion: process.version
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get agent health
   */
  async getAgentHealth(agents) {
    const agentHealth = {};

    for (const [name, agent] of agents) {
      agentHealth[name] = agent.getHealth();
    }

    return agentHealth;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs = 60000) {
    logger.info(`[HealthMonitor] Starting periodic health checks every ${intervalMs}ms`);

    this.checkInterval = setInterval(async () => {
      try {
        const health = await this.runAllChecks();

        if (health.status !== 'healthy') {
          logger.warn(`[HealthMonitor] System status: ${health.status}`);
          logger.warn('[HealthMonitor] Health check results:', JSON.stringify(health, null, 2));
        } else {
          logger.debug(`[HealthMonitor] All systems healthy`);
        }

      } catch (error) {
        logger.error('[HealthMonitor] Health check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      logger.info('[HealthMonitor] Stopped periodic health checks');
    }
  }
}

// Singleton instance
const healthMonitor = new HealthMonitor();

export default healthMonitor;
export { healthMonitor };
