import { logger } from '../utils/logger.js';

/**
 * ServiceProvider - Abstract base class for external service integrations
 * Provides a common interface for AI models, translation services, and other APIs
 */
export class ServiceProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      avgLatency: 0,
      totalCost: 0
    };
  }

  /**
   * Initialize the service provider
   * @returns {Promise<void>}
   */
  async initialize() {
    logger.info(`[${this.name}] Initializing service provider...`);
  }

  /**
   * Execute a request to the service
   * Must be implemented by subclasses
   * @param {string} prompt - Input prompt/request
   * @param {Object} config - Request configuration
   * @returns {Promise<*>} - Service response
   */
  async execute(prompt, config = {}) {
    throw new Error(`execute() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Validate configuration
   * @returns {boolean}
   */
  validateConfig() {
    return true;
  }

  /**
   * Get service health/status
   * @returns {Object}
   */
  getHealth() {
    return {
      service: this.name,
      metrics: this.metrics,
      healthy: this.metrics.failures < 10
    };
  }

  /**
   * Track request metrics
   * @param {boolean} success
   * @param {number} latency - ms
   * @param {number} cost - USD
   */
  trackMetrics(success, latency, cost = 0) {
    this.metrics.requests++;

    if (success) {
      this.metrics.successes++;
    } else {
      this.metrics.failures++;
    }

    // Update average latency
    this.metrics.avgLatency =
      (this.metrics.avgLatency * (this.metrics.requests - 1) + latency) /
      this.metrics.requests;

    // Track cost
    this.metrics.totalCost += cost;
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      avgLatency: 0,
      totalCost: 0
    };
  }
}

/**
 * AIServiceProvider - Base class for AI model providers
 */
export class AIServiceProvider extends ServiceProvider {
  constructor(name, config = {}) {
    super(name, config);
    this.model = config.model || 'default';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Generate text completion
   * @param {string} prompt
   * @param {Object} options
   * @returns {Promise<string>}
   */
  async generateCompletion(prompt, options = {}) {
    const config = {
      model: options.model || this.model,
      maxTokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      ...options
    };

    return this.execute(prompt, config);
  }

  /**
   * Extract structured data from text
   * @param {string} text
   * @param {Object} schema
   * @returns {Promise<Object>}
   */
  async extractStructuredData(text, schema) {
    const prompt = `Extract the following data from the text:\n\nSchema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn ONLY valid JSON matching the schema.`;
    const response = await this.generateCompletion(prompt);

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error(`[${this.name}] Failed to parse structured data:`, error);
      throw new Error('Invalid JSON response from AI service');
    }
  }

  /**
   * Estimate cost for a request
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @returns {number} - Cost in USD
   */
  estimateCost(inputTokens, outputTokens) {
    // Override in subclasses with model-specific pricing
    return 0;
  }
}

/**
 * TranslationServiceProvider - Base class for translation providers
 */
export class TranslationServiceProvider extends ServiceProvider {
  constructor(name, config = {}) {
    super(name, config);
    this.supportedLanguages = config.supportedLanguages || [];
  }

  /**
   * Translate text
   * @param {string} text
   * @param {string} targetLanguage
   * @param {string} sourceLanguage
   * @returns {Promise<Object>} - { translated, quality, detectedLanguage }
   */
  async translate(text, targetLanguage, sourceLanguage = 'auto') {
    if (!this.supportedLanguages.includes(targetLanguage)) {
      throw new Error(`Language ${targetLanguage} not supported by ${this.name}`);
    }

    return this.execute(text, { targetLanguage, sourceLanguage });
  }

  /**
   * Batch translate multiple texts
   * @param {Array<string>} texts
   * @param {string} targetLanguage
   * @returns {Promise<Array<Object>>}
   */
  async batchTranslate(texts, targetLanguage) {
    const promises = texts.map(text => this.translate(text, targetLanguage));
    return Promise.all(promises);
  }

  /**
   * Detect language of text
   * @param {string} text
   * @returns {Promise<string>}
   */
  async detectLanguage(text) {
    throw new Error(`detectLanguage() must be implemented by ${this.constructor.name}`);
  }
}

export default ServiceProvider;
