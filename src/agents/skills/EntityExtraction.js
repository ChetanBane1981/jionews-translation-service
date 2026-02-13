import { logger } from '../../utils/logger.js';

/**
 * EntityExtraction Skill
 * Extract named entities: people, places, organizations, topics, keywords
 */
export class EntityExtractionSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'entityExtraction';
  }

  /**
   * Execute entity extraction
   * @param {Object} input - { text, types }
   * @param {Object} options
   * @returns {Promise<Object>} - { people, places, organizations, topics, keywords }
   */
  async execute(input, options = {}) {
    const { text, types = ['people', 'places', 'organizations', 'topics', 'keywords'] } = input;

    if (!text) {
      throw new Error('Text is required for entity extraction');
    }

    logger.debug(`[${this.agent.name}] Extracting entities from text (${text.length} chars)`);

    // Use AI service provider if available
    if (this.agent.aiServiceProvider) {
      return this.extractWithAI(text, types);
    }

    // Fallback to heuristic-based extraction
    return this.extractHeuristic(text, types);
  }

  /**
   * Extract entities using AI service
   * @param {string} text
   * @param {Array<string>} types
   * @returns {Promise<Object>}
   */
  async extractWithAI(text, types) {
    const schema = {};
    if (types.includes('people')) schema.people = 'array of person names';
    if (types.includes('places')) schema.places = 'array of locations, cities, countries';
    if (types.includes('organizations')) schema.organizations = 'array of companies, organizations, institutions';
    if (types.includes('topics')) schema.topics = 'array of main topics or themes';
    if (types.includes('keywords')) schema.keywords = 'array of important keywords or phrases';

    try {
      const result = await this.agent.aiServiceProvider.extractStructuredData(text.substring(0, 3000), schema);

      return {
        people: result.people || [],
        places: result.places || [],
        organizations: result.organizations || [],
        topics: result.topics || [],
        keywords: result.keywords || [],
        method: 'ai'
      };

    } catch (error) {
      logger.warn(`[${this.agent.name}] AI entity extraction failed, falling back to heuristic:`, error.message);
      return this.extractHeuristic(text, types);
    }
  }

  /**
   * Heuristic-based entity extraction
   * @param {string} text
   * @param {Array<string>} types
   * @returns {Object}
   */
  extractHeuristic(text, types) {
    const entities = {
      people: [],
      places: [],
      organizations: [],
      topics: [],
      keywords: [],
      method: 'heuristic'
    };

    // Extract capitalized words (potential entities)
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const capitalizedMatches = text.match(capitalizedPattern) || [];

    // Filter by common patterns
    if (types.includes('people')) {
      // Names often have titles or appear with action verbs
      const namePattern = /(?:Mr\.|Mrs\.|Dr\.|President|Minister|CEO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
      let match;
      while ((match = namePattern.exec(text)) !== null) {
        if (!entities.people.includes(match[1])) {
          entities.people.push(match[1]);
        }
      }

      // Also add capitalized two-word phrases (common name pattern)
      capitalizedMatches.forEach(phrase => {
        const words = phrase.split(' ');
        if (words.length === 2 && !entities.people.includes(phrase)) {
          entities.people.push(phrase);
        }
      });
    }

    if (types.includes('places')) {
      // Common place indicators
      const placeKeywords = ['City', 'State', 'Country', 'Region', 'County', 'Province'];
      const placePattern = new RegExp(`(${placeKeywords.join('|')})\\s+of\\s+([A-Z][a-z]+)`, 'g');

      let match;
      while ((match = placePattern.exec(text)) !== null) {
        if (!entities.places.includes(match[2])) {
          entities.places.push(match[2]);
        }
      }

      // Also check for known countries/cities (sample list)
      const knownPlaces = ['India', 'China', 'USA', 'America', 'Europe', 'Asia', 'Delhi', 'Mumbai', 'Beijing', 'New York', 'London'];
      knownPlaces.forEach(place => {
        if (text.includes(place) && !entities.places.includes(place)) {
          entities.places.push(place);
        }
      });
    }

    if (types.includes('organizations')) {
      // Organizations often have Corp, Inc, Ltd, etc.
      const orgPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Corp|Inc|Ltd|LLC|Company|Organization|University|Institute|Agency)/g;
      let match;
      while ((match = orgPattern.exec(text)) !== null) {
        if (!entities.organizations.includes(match[1])) {
          entities.organizations.push(match[1]);
        }
      }
    }

    if (types.includes('topics')) {
      // Topics are often noun phrases (simple heuristic)
      const topicPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;
      const matches = text.match(topicPattern) || [];

      matches.forEach(topic => {
        if (topic.length > 4 && !entities.topics.includes(topic) && entities.topics.length < 5) {
          entities.topics.push(topic);
        }
      });
    }

    if (types.includes('keywords')) {
      // Extract frequent important words (excluding common words)
      const commonWords = new Set(['the', 'and', 'is', 'was', 'are', 'been', 'have', 'has', 'had', 'this', 'that', 'with', 'from']);
      const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];

      const wordFreq = {};
      words.forEach(word => {
        if (!commonWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      // Get top 10 words
      entities.keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    }

    // Limit results
    entities.people = entities.people.slice(0, 10);
    entities.places = entities.places.slice(0, 10);
    entities.organizations = entities.organizations.slice(0, 10);
    entities.topics = entities.topics.slice(0, 5);

    return entities;
  }

  /**
   * Batch extract entities from multiple texts
   * @param {Array<string>} texts
   * @returns {Promise<Array<Object>>}
   */
  async extractBatch(texts) {
    const promises = texts.map(text => this.execute({ text }));
    return Promise.all(promises);
  }
}

export default EntityExtractionSkill;
