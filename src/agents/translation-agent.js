import { BaseAgent } from './BaseAgent.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Translation Agent - Autonomous multi-language translation
 * Uses Sarvam AI for Indian language translation
 */
export class TranslationAgent extends BaseAgent {
  constructor() {
    super('TranslationAgent', {
      autoRetry: true,
      model: 'sarvam-translate'
    });

    this.sarvamApiKey = process.env.SARVAM_API_KEY;
    this.supportedLanguages = [
      'hi', // Hindi
      'ta', // Tamil
      'te', // Telugu
      'bn', // Bengali
      'mr', // Marathi
      'gu', // Gujarati
      'kn', // Kannada
      'ml', // Malayalam
      'pa', // Punjabi
      'or'  // Odia
    ];
  }

  async initialize() {
    await super.initialize();

    if (!this.sarvamApiKey) {
      logger.warn('[TranslationAgent] SARVAM_API_KEY not found - using mock translations');
    } else {
      logger.info('[TranslationAgent] Sarvam AI initialized with API key');
    }
  }

  /**
   * Execute: Translate news to multiple languages
   */
  async execute(task) {
    const { headline } = task;

    logger.info(`[TranslationAgent] Translating: ${headline.title}`);

    const translations = [];

    // Translate to all supported languages
    for (const lang of this.supportedLanguages) {
      try {
        const translation = await this.translateToLanguage(headline, lang);
        translations.push(translation);
      } catch (error) {
        logger.error(`[TranslationAgent] Failed to translate to ${lang}:`, error.message);
        // Continue with other languages
      }
    }

    logger.info(`[TranslationAgent] Translated to ${translations.length} languages`);

    return {
      ...headline,
      translations,
      translatedAt: new Date()
    };
  }

  /**
   * Translate to a specific language
   */
  async translateToLanguage(headline, targetLang) {
    if (!this.sarvamApiKey) {
      // Mock translation for development
      return this.mockTranslate(headline, targetLang);
    }

    try {
      // Sarvam AI Translation API
      // Documentation: https://docs.sarvam.ai/
      const response = await axios.post(
        'https://api.sarvam.ai/translate',
        {
          input: headline.summary || headline.description || headline.title,
          source_language_code: 'en',
          target_language_code: targetLang,
          mode: 'formal' // or 'informal'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.sarvamApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const translatedText = response.data.translated_text || response.data.output;

      // Quality scoring (basic)
      const quality = this.calculateQualityScore(translatedText);

      return {
        language: targetLang,
        languageName: this.getLanguageName(targetLang),
        title: headline.title, // Title translation would be separate call
        summary: translatedText,
        quality,
        provider: 'sarvam'
      };

    } catch (error) {
      logger.error(`[TranslationAgent] Sarvam API error for ${targetLang}:`, error.message);

      // Fallback to mock
      return this.mockTranslate(headline, targetLang);
    }
  }

  /**
   * Mock translation for development/testing
   */
  mockTranslate(headline, targetLang) {
    const langName = this.getLanguageName(targetLang);

    return {
      language: targetLang,
      languageName: langName,
      title: `[${langName}] ${headline.title}`,
      summary: `[${langName} Translation] ${headline.summary || headline.description}`,
      quality: 75,
      provider: 'mock'
    };
  }

  /**
   * Calculate translation quality score
   */
  calculateQualityScore(translatedText) {
    // Basic quality checks
    let score = 100;

    if (!translatedText || translatedText.length === 0) {
      return 0;
    }

    // Penalize very short translations
    if (translatedText.length < 20) {
      score -= 20;
    }

    // Penalize if still contains English characters (rough check)
    const englishChars = translatedText.match(/[a-zA-Z]/g);
    if (englishChars && englishChars.length > translatedText.length * 0.3) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get language name from code
   */
  getLanguageName(langCode) {
    const languageNames = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'or': 'Odia'
    };

    return languageNames[langCode] || langCode.toUpperCase();
  }

  /**
   * Autonomous decision: Skip translation if not needed
   */
  async makeDecision(headline, criteria) {
    // Skip translation for low-quality or unpublished items
    if (headline.credibilityScore < 50 || !headline.moderationPassed) {
      return {
        approved: false,
        reasoning: 'Skipping translation for low-quality content'
      };
    }

    return {
      approved: true,
      reasoning: 'Content approved for translation'
    };
  }
}

export default TranslationAgent;
