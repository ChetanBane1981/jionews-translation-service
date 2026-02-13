import { logger } from '../../utils/logger.js';

/**
 * DataEnrichment Skill
 * Extract metadata, add computed fields, cross-reference with external data
 */
export class DataEnrichmentSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'dataEnrichment';
  }

  /**
   * Execute data enrichment
   * @param {Object} input - { data, enrichments }
   * @param {Object} options
   * @returns {Promise<Object>} - Enriched data
   */
  async execute(input, options = {}) {
    const { data, enrichments = ['metadata', 'computed', 'references'] } = input;

    let enrichedData = { ...data };

    for (const enrichment of enrichments) {
      switch (enrichment) {
        case 'metadata':
          enrichedData = this.addMetadata(enrichedData);
          break;
        case 'computed':
          enrichedData = this.addComputedFields(enrichedData);
          break;
        case 'references':
          enrichedData = await this.addReferences(enrichedData);
          break;
        case 'timestamps':
          enrichedData = this.addTimestamps(enrichedData);
          break;
        case 'identifiers':
          enrichedData = this.addIdentifiers(enrichedData);
          break;
        default:
          logger.warn(`[${this.agent.name}] Unknown enrichment type: ${enrichment}`);
      }
    }

    return enrichedData;
  }

  /**
   * Add metadata to data
   * @param {Object} data
   * @returns {Object}
   */
  addMetadata(data) {
    if (!data.metadata) {
      data.metadata = {};
    }

    // Add processing metadata
    data.metadata.enrichedAt = new Date().toISOString();
    data.metadata.enrichedBy = this.agent.name;

    // Extract text statistics if content exists
    if (data.content || data.description) {
      const text = data.content || data.description;
      data.metadata.textStats = {
        characterCount: text.length,
        wordCount: text.split(/\s+/).length,
        paragraphCount: text.split(/\n\n+/).length,
        readingTimeMinutes: Math.ceil(text.split(/\s+/).length / 200) // Avg 200 words/min
      };
    }

    // Extract domain from URL
    if (data.url) {
      try {
        const urlObj = new URL(data.url);
        data.metadata.domain = urlObj.hostname;
        data.metadata.protocol = urlObj.protocol;
      } catch (error) {
        logger.debug(`[${this.agent.name}] Invalid URL: ${data.url}`);
      }
    }

    return data;
  }

  /**
   * Add computed fields
   * @param {Object} data
   * @returns {Object}
   */
  addComputedFields(data) {
    // Compute quality score if credibility data exists
    if (data.processingResults?.credibility) {
      const cred = data.processingResults.credibility;
      data.qualityScore = this.computeQualityScore(cred);
    }

    // Compute engagement potential
    if (data.processingResults?.importance && data.processingResults?.sentiment) {
      data.engagementPotential = this.computeEngagementPotential(
        data.processingResults.importance,
        data.processingResults.sentiment
      );
    }

    // Compute freshness score (recency)
    if (data.publishedAt) {
      data.freshnessScore = this.computeFreshnessScore(data.publishedAt);
    }

    // Compute completeness score
    data.completenessScore = this.computeCompletenessScore(data);

    return data;
  }

  /**
   * Add cross-references to external data
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async addReferences(data) {
    if (!data.references) {
      data.references = {};
    }

    // Add similar content references (if clustering was done)
    if (data.processingResults?.clustering?.clusterId) {
      data.references.cluster = data.processingResults.clustering.clusterId;
      data.references.similarCount = await this.getSimilarCount(data.processingResults.clustering.clusterId);
    }

    // Add source references
    if (data.sourceName) {
      data.references.source = {
        name: data.sourceName,
        trustScore: data.sourceTrust || 50
      };
    }

    return data;
  }

  /**
   * Add timestamp fields
   * @param {Object} data
   * @returns {Object}
   */
  addTimestamps(data) {
    const now = new Date();

    if (!data.processedAt) {
      data.processedAt = now.toISOString();
    }

    if (!data.fetchedAt) {
      data.fetchedAt = now.toISOString();
    }

    // Calculate age
    if (data.publishedAt) {
      const published = new Date(data.publishedAt);
      data.ageHours = (now - published) / (1000 * 60 * 60);
      data.ageDays = data.ageHours / 24;
    }

    return data;
  }

  /**
   * Add identifier fields
   * @param {Object} data
   * @returns {Object}
   */
  addIdentifiers(data) {
    // Generate unique hash if ID not present
    if (!data.id) {
      data.id = this.generateHash(data.title || data.url || String(Date.now()));
    }

    // Add content fingerprint for deduplication
    if (data.content || data.title) {
      data.fingerprint = this.generateContentFingerprint(data);
    }

    return data;
  }

  /**
   * Compute quality score
   * @param {Object} credibility
   * @returns {number}
   */
  computeQualityScore(credibility) {
    const score = credibility.score || 50;
    const verified = credibility.verified ? 10 : 0;
    const redFlagsP penalty = (credibility.redFlags?.length || 0) * 5;

    return Math.max(0, Math.min(100, score + verified - penalty));
  }

  /**
   * Compute engagement potential
   * @param {Object} importance
   * @param {Object} sentiment
   * @returns {number}
   */
  computeEngagementPotential(importance, sentiment) {
    const importanceScore = importance.score || 50;
    const sentimentIntensity = Math.abs(sentiment.score || 0); // Extreme sentiments engage more

    return (importanceScore + sentimentIntensity) / 2;
  }

  /**
   * Compute freshness score (0-100, higher = newer)
   * @param {string|Date} publishedAt
   * @returns {number}
   */
  computeFreshnessScore(publishedAt) {
    const now = Date.now();
    const published = new Date(publishedAt).getTime();
    const ageHours = (now - published) / (1000 * 60 * 60);

    // Exponential decay: 100 at 0 hours, 50 at 24 hours, 25 at 48 hours, etc.
    return Math.max(0, Math.min(100, 100 * Math.exp(-ageHours / 24)));
  }

  /**
   * Compute completeness score
   * @param {Object} data
   * @returns {number}
   */
  computeCompletenessScore(data) {
    const fields = ['title', 'content', 'description', 'author', 'sourceName', 'publishedAt', 'imageUrl'];
    const presentFields = fields.filter(field => data[field]).length;

    return (presentFields / fields.length) * 100;
  }

  /**
   * Get count of similar items in cluster
   * @param {string} clusterId
   * @returns {Promise<number>}
   */
  async getSimilarCount(clusterId) {
    // Placeholder - would query database in production
    return 0;
  }

  /**
   * Generate hash for content
   * @param {string} content
   * @returns {string}
   */
  generateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Generate content fingerprint for deduplication
   * @param {Object} data
   * @returns {string}
   */
  generateContentFingerprint(data) {
    const crypto = require('crypto');
    const content = `${data.title || ''}|${data.content || ''}`.toLowerCase();
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

export default DataEnrichmentSkill;
