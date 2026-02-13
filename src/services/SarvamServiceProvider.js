import axios from 'axios';
import { TranslationServiceProvider } from './ServiceProvider.js';
import { logger } from '../utils/logger.js';

/**
 * SarvamServiceProvider - Sarvam AI translation service
 * Specialized for Indian languages
 */
export class SarvamServiceProvider extends TranslationServiceProvider {
  constructor(config = {}) {
    super('sarvam', config);

    this.apiKey = config.apiKey || process.env.SARVAM_API_KEY;
    this.baseURL = config.baseURL || 'https://api.sarvam.ai/translate';
    this.supportedLanguages = config.supportedLanguages || [
      'hi', // Hindi
      'ta', // Tamil
      'te', // Telugu
      'ml', // Malayalam
      'kn', // Kannada
      'gu', // Gujarati
      'mr', // Marathi
      'bn', // Bengali
      'pa', // Punjabi
      'or', // Odia
      'en'  // English
    ];

    if (!this.apiKey) {
      logger.warn('SARVAM_API_KEY not set - translation service may not work');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Execute translation request
   * @param {string} text - Text to translate
   * @param {Object} config - { targetLanguage, sourceLanguage }
   * @returns {Promise<Object>} - { translated, quality, detectedLanguage }
   */
  async execute(text, config = {}) {
    const startTime = Date.now();

    try {
      const response = await this.client.post('', {
        input: text,
        source_language_code: config.sourceLanguage || 'en',
        target_language_code: config.targetLanguage,
        speaker_gender: config.speakerGender || 'neutral',
        mode: config.mode || 'formal'
      });

      const latency = Date.now() - startTime;
      this.trackMetrics(true, latency, 0.001); // Estimate $0.001 per translation

      return {
        translated: response.data.translated_text,
        quality: response.data.quality_score || 0.9,
        detectedLanguage: config.sourceLanguage || 'en'
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.trackMetrics(false, latency);

      logger.error(`[${this.name}] Translation failed:`, error.message);

      // Fallback to mock translation in development
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[${this.name}] Using mock translation in development mode`);
        return {
          translated: `[${config.targetLanguage}] ${text}`,
          quality: 0.5,
          detectedLanguage: config.sourceLanguage || 'en'
        };
      }

      throw error;
    }
  }

  /**
   * Translate text to target language
   * @param {string} text
   * @param {string} targetLanguage
   * @param {string} sourceLanguage
   * @returns {Promise<Object>}
   */
  async translate(text, targetLanguage, sourceLanguage = 'en') {
    if (!this.supportedLanguages.includes(targetLanguage)) {
      throw new Error(`Language ${targetLanguage} not supported by Sarvam AI`);
    }

    return this.execute(text, { targetLanguage, sourceLanguage });
  }

  /**
   * Batch translate multiple texts
   * @param {Array<string>} texts
   * @param {string} targetLanguage
   * @param {string} sourceLanguage
   * @returns {Promise<Array<Object>>}
   */
  async batchTranslate(texts, targetLanguage, sourceLanguage = 'en') {
    logger.info(`[${this.name}] Batch translating ${texts.length} texts to ${targetLanguage}`);

    // Sarvam AI may have rate limits, so we translate in batches
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text =>
        this.translate(text, targetLanguage, sourceLanguage)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Detect language of text
   * @param {string} text
   * @returns {Promise<string>}
   */
  async detectLanguage(text) {
    // Sarvam AI doesn't have a dedicated language detection endpoint
    // We can use a heuristic or call Anthropic for this
    logger.warn(`[${this.name}] Language detection not natively supported, using heuristic`);

    // Simple heuristic based on Unicode ranges
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi)
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali

    return 'en'; // Default to English
  }

  /**
   * Translate article (title + content + summary)
   * @param {Object} article - { title, content, summary }
   * @param {string} targetLanguage
   * @returns {Promise<Object>} - Translated article
   */
  async translateArticle(article, targetLanguage) {
    const startTime = Date.now();

    try {
      const [titleResult, contentResult, summaryResult] = await Promise.all([
        this.translate(article.title, targetLanguage),
        article.content ? this.translate(article.content, targetLanguage) : null,
        article.summary ? this.translate(article.summary, targetLanguage) : null
      ]);

      const latency = Date.now() - startTime;
      logger.info(`[${this.name}] Article translated in ${latency}ms`);

      return {
        title: titleResult.translated,
        content: contentResult?.translated,
        summary: summaryResult?.translated,
        language: targetLanguage,
        quality: (titleResult.quality + (contentResult?.quality || 0) + (summaryResult?.quality || 0)) / 3
      };

    } catch (error) {
      logger.error(`[${this.name}] Article translation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get supported language info
   * @returns {Array<Object>}
   */
  getSupportedLanguages() {
    const languageNames = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'mr': 'Marathi',
      'bn': 'Bengali',
      'pa': 'Punjabi',
      'or': 'Odia',
      'en': 'English'
    };

    return this.supportedLanguages.map(code => ({
      code,
      name: languageNames[code] || code,
      enabled: true
    }));
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
   * Validate configuration
   * @returns {boolean}
   */
  validateConfig() {
    return !!(this.apiKey && this.supportedLanguages.length > 0);
  }

  /**
   * Test connection to Sarvam API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.translate('Hello', 'hi', 'en');
      logger.info(`[${this.name}] Connection test successful`);
      return true;
    } catch (error) {
      logger.error(`[${this.name}] Connection test failed:`, error.message);
      return false;
    }
  }
}

export default SarvamServiceProvider;
