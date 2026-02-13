import { BaseAgent } from './BaseAgent.js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

/**
 * Translation Agent - Autonomous multi-language translation
 * Uses Claude AI for high-quality translations
 */
export class TranslationAgent extends BaseAgent {
  constructor() {
    super('TranslationAgent', {
      autoRetry: true,
      model: 'claude-sonnet-4-5-20250929'
    });

    this.anthropic = null;
    this.supportedLanguages = [
      { code: 'hi', name: 'Hindi' },
      { code: 'ta', name: 'Tamil' },
      { code: 'te', name: 'Telugu' },
      { code: 'bn', name: 'Bengali' },
      { code: 'mr', name: 'Marathi' },
      { code: 'gu', name: 'Gujarati' },
      { code: 'kn', name: 'Kannada' },
      { code: 'ml', name: 'Malayalam' }
    ];
  }

  async initialize() {
    await super.initialize();

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    logger.info('[TranslationAgent] Claude AI initialized for translations');
  }

  /**
   * Execute: Translate news to multiple languages using Claude
   */
  async execute(task) {
    const { headline } = task;

    logger.info(`[TranslationAgent] Translating: ${headline.title} to 8 languages using Claude`);

    const translations = [];

    // Translate to all supported languages in parallel
    const translationPromises = this.supportedLanguages.map(lang =>
      this.translateToLanguage(headline, lang)
    );

    const results = await Promise.allSettled(translationPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        translations.push(result.value);
      } else {
        logger.error(`[TranslationAgent] Failed to translate to ${this.supportedLanguages[index].name}`);
      }
    });

    logger.info(`[TranslationAgent] ✅ Translated to ${translations.length}/8 languages`);

    return {
      ...headline,
      translations,
      translatedAt: new Date()
    };
  }

  /**
   * Translate to a specific language using Claude
   */
  async translateToLanguage(headline, targetLang) {
    try {
      const textToTranslate = headline.summary || headline.description || headline.title;

      const prompt = `Translate the following English news text to ${targetLang.name} (${targetLang.code}):

"${textToTranslate}"

Provide ONLY the translation, no explanations or additional text.`;

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      const translatedText = response.content[0].text.trim();

      return {
        language: targetLang.code,
        languageName: targetLang.name,
        title: headline.title,
        summary: translatedText,
        quality: 95, // Claude provides high-quality translations
        provider: 'claude'
      };

    } catch (error) {
      logger.error(`[TranslationAgent] Claude API error for ${targetLang.name}:`, error.message);

      // Return error placeholder
      return {
        language: targetLang.code,
        languageName: targetLang.name,
        title: headline.title,
        summary: `[Translation unavailable]`,
        quality: 0,
        provider: 'error'
      };
    }
  }

  /**
   * Autonomous decision: Skip translation if not needed
   */
  async makeDecision(headline, criteria) {
    // All headlines get translated automatically
    return {
      approved: true,
      reasoning: 'Auto-translating to 8 languages'
    };
  }
}

export default TranslationAgent;
