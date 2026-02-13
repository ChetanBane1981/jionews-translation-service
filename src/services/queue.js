import Bull from 'bull';
import { logger } from '../utils/logger.js';

/**
 * Queue Manager - Redis-based task queues for agents
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  /**
   * Create or get a queue
   */
  getQueue(name) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Bull(name, this.redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });

    // Event listeners
    queue.on('error', (error) => {
      logger.error(`[Queue:${name}] Error:`, error);
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`[Queue:${name}] Job ${jobId} waiting`);
    });

    queue.on('active', (job) => {
      logger.info(`[Queue:${name}] Job ${job.id} started`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`[Queue:${name}] Job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      logger.error(`[Queue:${name}] Job ${job.id} failed:`, err.message);
    });

    queue.on('stalled', (job) => {
      logger.warn(`[Queue:${name}] Job ${job.id} stalled`);
    });

    this.queues.set(name, queue);
    logger.info(`[QueueManager] Created queue: ${name}`);

    return queue;
  }

  /**
   * Initialize all agent queues
   */
  initializeQueues() {
    const agentQueues = [
      'feed',
      'detection',
      'cluster',
      'moderation',
      'credibility',
      'summary',
      'translation',
      'personalization',
      'publishing'
    ];

    agentQueues.forEach(queueName => {
      this.getQueue(queueName);
    });

    logger.info(`[QueueManager] Initialized ${agentQueues.length} queues`);
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, data, options = {}) {
    const queue = this.getQueue(queueName);

    try {
      const job = await queue.add(data, options);
      logger.info(`[QueueManager] Added job ${job.id} to ${queueName}`);
      return job;
    } catch (error) {
      logger.error(`[QueueManager] Failed to add job to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Process jobs in queue
   */
  processQueue(queueName, processor, concurrency = 1) {
    const queue = this.getQueue(queueName);

    queue.process(concurrency, async (job) => {
      try {
        logger.info(`[QueueManager] Processing job ${job.id} in ${queueName}`);
        const result = await processor(job.data);
        return result;
      } catch (error) {
        logger.error(`[QueueManager] Job ${job.id} processing error:`, error);
        throw error;
      }
    });

    logger.info(`[QueueManager] Started processing ${queueName} with concurrency ${concurrency}`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }

  /**
   * Get all queues statistics
   */
  async getAllStats() {
    const stats = {};

    for (const [name, queue] of this.queues) {
      stats[name] = await this.getQueueStats(name);
    }

    return stats;
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`[QueueManager] Paused queue: ${queueName}`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`[QueueManager] Resumed queue: ${queueName}`);
  }

  /**
   * Clear queue
   */
  async clearQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.empty();
    logger.info(`[QueueManager] Cleared queue: ${queueName}`);
  }

  /**
   * Close all queues
   */
  async closeAll() {
    logger.info('[QueueManager] Closing all queues...');

    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`[QueueManager] Closed queue: ${name}`);
    }

    this.queues.clear();
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getAllStats();

      return {
        healthy: true,
        queues: Object.keys(stats).length,
        stats
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const queueManager = new QueueManager();

export default queueManager;
export { queueManager };
