import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * CacheManagement Skill
 * Cache frequent queries, dedupe checks, source lookups
 * Memory-efficient with TTL-based invalidation
 */
export class CacheManagementSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'cacheManagement';
    this.cache = new Map(); // In-memory cache
    this.ttlTimers = new Map(); // TTL timers
    this.defaultTTL = 60000; // 1 minute default
    this.maxSize = 1000; // Max cache entries
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Execute cache operation
   * @param {Object} input - { operation, key, value, ttl }
   * @param {Object} options
   * @returns {Promise<*>}
   */
  async execute(input, options = {}) {
    const { operation, key, value, ttl } = input;

    switch (operation) {
      case 'get':
        return this.get(key);
      case 'set':
        return this.set(key, value, ttl);
      case 'delete':
        return this.delete(key);
      case 'has':
        return this.has(key);
      case 'clear':
        return this.clear();
      case 'stats':
        return this.getStats();
      default:
        throw new Error(`Unknown cache operation: ${operation}`);
    }
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const hashedKey = this.hashKey(key);

    if (this.cache.has(hashedKey)) {
      this.hits++;
      logger.debug(`[${this.agent.name}] Cache hit: ${key}`);
      return this.cache.get(hashedKey).value;
    }

    this.misses++;
    logger.debug(`[${this.agent.name}] Cache miss: ${key}`);
    return null;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean}
   */
  set(key, value, ttl = this.defaultTTL) {
    const hashedKey = this.hashKey(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(hashedKey)) {
      this.evictOldest();
    }

    // Clear existing TTL timer
    if (this.ttlTimers.has(hashedKey)) {
      clearTimeout(this.ttlTimers.get(hashedKey));
    }

    // Set value
    this.cache.set(hashedKey, {
      value,
      timestamp: Date.now()
    });

    // Set TTL timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);

      this.ttlTimers.set(hashedKey, timer);
    }

    logger.debug(`[${this.agent.name}] Cache set: ${key} (TTL: ${ttl}ms)`);
    return true;
  }

  /**
   * Delete value from cache
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    const hashedKey = this.hashKey(key);

    // Clear TTL timer
    if (this.ttlTimers.has(hashedKey)) {
      clearTimeout(this.ttlTimers.get(hashedKey));
      this.ttlTimers.delete(hashedKey);
    }

    const deleted = this.cache.delete(hashedKey);
    if (deleted) {
      logger.debug(`[${this.agent.name}] Cache deleted: ${key}`);
    }

    return deleted;
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const hashedKey = this.hashKey(key);
    return this.cache.has(hashedKey);
  }

  /**
   * Clear entire cache
   * @returns {void}
   */
  clear() {
    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.ttlTimers.clear();
    this.hits = 0;
    this.misses = 0;

    logger.info(`[${this.agent.name}] Cache cleared`);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests
    };
  }

  /**
   * Evict oldest entry
   * @returns {void}
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`[${this.agent.name}] Evicted oldest cache entry`);
    }
  }

  /**
   * Hash key for privacy and consistency
   * @param {string} key
   * @returns {string}
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(String(key)).digest('hex');
  }
}

export default CacheManagementSkill;
