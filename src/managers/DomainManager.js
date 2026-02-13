import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import DomainConfig from '../models/DomainConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DomainManager - Manages multiple domain configurations
 * Loads, validates, and provides domain-specific settings to agents
 */
export class DomainManager {
  constructor() {
    this.domains = new Map(); // domainId -> config
    this.configDir = path.join(__dirname, '../config/domains');
    this.watchMode = false;
  }

  /**
   * Initialize domain manager
   * Loads all domain configurations from files
   */
  async initialize() {
    logger.info('[DomainManager] Initializing...');

    try {
      // Load domain configurations from JSON files
      await this.loadDomainsFromFiles();

      // Optionally load from database
      // await this.loadDomainsFromDatabase();

      logger.info(`[DomainManager] Loaded ${this.domains.size} domain configurations`);

      return true;
    } catch (error) {
      logger.error('[DomainManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load domain configurations from JSON files
   */
  async loadDomainsFromFiles() {
    if (!fs.existsSync(this.configDir)) {
      logger.warn(`[DomainManager] Config directory not found: ${this.configDir}`);
      return;
    }

    const files = fs.readdirSync(this.configDir).filter(f => f.endsWith('.domain.json'));

    logger.info(`[DomainManager] Found ${files.length} domain config files`);

    for (const file of files) {
      try {
        const filePath = path.join(this.configDir, file);
        const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Validate configuration
        const validation = this.validateDomainConfig(configData);
        if (!validation.valid) {
          logger.error(`[DomainManager] Invalid config in ${file}:`, validation.errors);
          continue;
        }

        // Store configuration
        this.domains.set(configData.domainId, configData);
        logger.info(`[DomainManager] Loaded domain: ${configData.domainId} (${configData.name})`);

      } catch (error) {
        logger.error(`[DomainManager] Failed to load ${file}:`, error.message);
      }
    }
  }

  /**
   * Load domain configurations from database
   */
  async loadDomainsFromDatabase() {
    try {
      const dbConfigs = await DomainConfig.findEnabled();

      for (const dbConfig of dbConfigs) {
        this.domains.set(dbConfig.domainId, dbConfig.toObject());
      }

      logger.info(`[DomainManager] Loaded ${dbConfigs.length} domains from database`);
    } catch (error) {
      logger.warn('[DomainManager] Could not load from database:', error.message);
    }
  }

  /**
   * Get domain configuration
   * @param {string} domainId
   * @returns {Object|null}
   */
  getDomainConfig(domainId) {
    const config = this.domains.get(domainId);

    if (!config) {
      logger.warn(`[DomainManager] Domain not found: ${domainId}`);
      return null;
    }

    if (!config.enabled) {
      logger.warn(`[DomainManager] Domain disabled: ${domainId}`);
      return null;
    }

    return config;
  }

  /**
   * Get all enabled domains
   * @returns {Array<Object>}
   */
  getAllDomains() {
    return Array.from(this.domains.values()).filter(d => d.enabled);
  }

  /**
   * Get domains by content type
   * @param {string} contentType
   * @returns {Array<Object>}
   */
  getDomainsByContentType(contentType) {
    return this.getAllDomains().filter(d => d.contentType === contentType);
  }

  /**
   * Validate domain configuration
   * @param {Object} config
   * @returns {Object} - { valid, errors }
   */
  validateDomainConfig(config) {
    const errors = [];

    // Required fields
    if (!config.domainId) errors.push('Missing domainId');
    if (!config.name) errors.push('Missing name');
    if (!config.contentType) errors.push('Missing contentType');

    // Agent pipeline validation
    if (!config.agentPipeline || !Array.isArray(config.agentPipeline)) {
      errors.push('Missing or invalid agentPipeline');
    } else {
      const orders = config.agentPipeline.map(a => a.order).filter(o => o !== undefined);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push('Duplicate agent order values');
      }
    }

    // Thresholds validation
    if (config.thresholds) {
      if (config.thresholds.autoPublishMin < config.thresholds.credibilityMin) {
        errors.push('autoPublishMin cannot be lower than credibilityMin');
      }
      if (config.thresholds.similarityThreshold > 1 || config.thresholds.similarityThreshold < 0) {
        errors.push('similarityThreshold must be between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reload a specific domain configuration
   * @param {string} domainId
   * @returns {boolean}
   */
  async reloadDomain(domainId) {
    try {
      const file = `${domainId}.domain.json`;
      const filePath = path.join(this.configDir, file);

      if (!fs.existsSync(filePath)) {
        logger.error(`[DomainManager] Config file not found: ${file}`);
        return false;
      }

      const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Validate
      const validation = this.validateDomainConfig(configData);
      if (!validation.valid) {
        logger.error(`[DomainManager] Invalid config:`, validation.errors);
        return false;
      }

      // Update
      this.domains.set(domainId, configData);
      logger.info(`[DomainManager] Reloaded domain: ${domainId}`);

      return true;

    } catch (error) {
      logger.error(`[DomainManager] Failed to reload ${domainId}:`, error.message);
      return false;
    }
  }

  /**
   * Enable/disable a domain
   * @param {string} domainId
   * @param {boolean} enabled
   * @returns {boolean}
   */
  setDomainEnabled(domainId, enabled) {
    const config = this.domains.get(domainId);

    if (!config) {
      logger.error(`[DomainManager] Domain not found: ${domainId}`);
      return false;
    }

    config.enabled = enabled;
    logger.info(`[DomainManager] Domain ${domainId} ${enabled ? 'enabled' : 'disabled'}`);

    return true;
  }

  /**
   * Get domain categories
   * @param {string} domainId
   * @returns {Array<Object>}
   */
  getDomainCategories(domainId) {
    const config = this.getDomainConfig(domainId);
    return config?.categories || [];
  }

  /**
   * Get domain user segments
   * @param {string} domainId
   * @returns {Array<Object>}
   */
  getDomainUserSegments(domainId) {
    const config = this.getDomainConfig(domainId);
    return config?.userSegments || [];
  }

  /**
   * Get domain agent pipeline
   * @param {string} domainId
   * @returns {Array<Object>}
   */
  getDomainAgentPipeline(domainId) {
    const config = this.getDomainConfig(domainId);

    if (!config) return [];

    return config.agentPipeline
      .filter(agent => agent.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get domain thresholds
   * @param {string} domainId
   * @returns {Object}
   */
  getDomainThresholds(domainId) {
    const config = this.getDomainConfig(domainId);
    return config?.thresholds || {};
  }

  /**
   * Get domain translation settings
   * @param {string} domainId
   * @returns {Object}
   */
  getDomainTranslationSettings(domainId) {
    const config = this.getDomainConfig(domainId);
    return config?.translation || { enabled: false };
  }

  /**
   * Get domain branding
   * @param {string} domainId
   * @returns {Object}
   */
  getDomainBranding(domainId) {
    const config = this.getDomainConfig(domainId);
    return config?.branding || { title: 'Unknown Domain', subtitle: '' };
  }

  /**
   * Export domain configuration as JSON
   * @param {string} domainId
   * @returns {string}
   */
  exportDomainConfig(domainId) {
    const config = this.getDomainConfig(domainId);
    if (!config) return null;

    return JSON.stringify(config, null, 2);
  }

  /**
   * Save domain configuration to file
   * @param {string} domainId
   * @param {Object} config
   * @returns {boolean}
   */
  saveDomainConfig(domainId, config) {
    try {
      // Validate
      const validation = this.validateDomainConfig(config);
      if (!validation.valid) {
        logger.error(`[DomainManager] Invalid config:`, validation.errors);
        return false;
      }

      // Save to file
      const file = `${domainId}.domain.json`;
      const filePath = path.join(this.configDir, file);

      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');

      // Update in memory
      this.domains.set(domainId, config);

      logger.info(`[DomainManager] Saved domain config: ${domainId}`);
      return true;

    } catch (error) {
      logger.error(`[DomainManager] Failed to save ${domainId}:`, error.message);
      return false;
    }
  }

  /**
   * Get domain statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalDomains: this.domains.size,
      enabledDomains: this.getAllDomains().length,
      byContentType: {},
      domainList: []
    };

    for (const config of this.domains.values()) {
      if (!stats.byContentType[config.contentType]) {
        stats.byContentType[config.contentType] = 0;
      }
      stats.byContentType[config.contentType]++;

      stats.domainList.push({
        domainId: config.domainId,
        name: config.name,
        contentType: config.contentType,
        enabled: config.enabled,
        agentCount: config.agentPipeline?.length || 0
      });
    }

    return stats;
  }

  /**
   * Watch for configuration file changes
   * @param {Function} callback - Called when config changes
   */
  watchConfigs(callback) {
    if (this.watchMode) return;

    this.watchMode = true;

    fs.watch(this.configDir, async (eventType, filename) => {
      if (filename && filename.endsWith('.domain.json')) {
        logger.info(`[DomainManager] Config file changed: ${filename}`);

        const domainId = filename.replace('.domain.json', '');
        await this.reloadDomain(domainId);

        if (callback) callback(domainId, eventType);
      }
    });

    logger.info('[DomainManager] Watching for config changes...');
  }
}

// Create singleton instance
const domainManager = new DomainManager();

export default domainManager;
