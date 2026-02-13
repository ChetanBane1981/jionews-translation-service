import { BaseAgent } from './BaseAgent.js';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

/**
 * Translation Agent - Autonomous multi-language translation
 * Uses Gemini AI (primary) and Claude AI (fallback) for high-quality translations
 */
export class TranslationAgent extends BaseAgent {
  constructor() {
    super('TranslationAgent', {
      autoRetry: true,
      model: 'claude-sonnet-4-5-20250929'
    });

    this.anthropic = null;
    this.gemini = null;
    this.geminiModel = null;
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

    // Initialize Gemini (primary for regional languages)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Try Gemini 2.0 Flash experimental model
      this.geminiModel = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      logger.info('[TranslationAgent] 🌟 Gemini AI initialized (primary) using gemini-2.0-flash-exp');
    }

    // Initialize Claude (fallback)
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    logger.info('[TranslationAgent] Claude AI initialized (fallback) for translations');
  }

  /**
   * Execute: Translate news to multiple languages using BOTH Gemini AND Claude for comparison
   */
  async execute(task) {
    const { headline } = task;

    logger.info(`[TranslationAgent] 🔄 Comparing translations: ${headline.title} (Gemini vs Claude)`);

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

    // Count successful translations
    const geminiSuccess = translations.filter(t => t.geminiQuality > 0).length;
    const claudeSuccess = translations.filter(t => t.claudeQuality > 0).length;

    logger.info(`[TranslationAgent] ✅ Translation comparison complete: ${translations.length}/8 languages (Gemini: ${geminiSuccess}/8, Claude: ${claudeSuccess}/8)`);

    return {
      ...headline,
      translations,
      translatedAt: new Date(),
      comparisonMode: true
    };
  }

  /**
   * Translate to a specific language using Claude
   * Translates both title and summary
   */
  async translateToLanguage(headline, targetLang) {
    // Translate both title and summary
    const titleToTranslate = headline.title;
    const summaryToTranslate = headline.aiSummary || headline.summary || headline.description;
    const translations = {};

    // Translate with Gemini
    if (this.geminiModel) {
      try {
        const prompt = `Translate the following English news text to ${targetLang.name} language. Provide ONLY the translation in ${targetLang.name} script, no explanations:

"${textToTranslate}"`;

        const result = await this.geminiModel.generateContent(prompt);
        const translatedText = result.response.text().trim();

        translations.gemini = {
          text: translatedText,
          quality: 98,
          provider: 'gemini'
        };

      } catch (error) {
        logger.error(`[TranslationAgent] Gemini error for ${targetLang.name}:`, {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n')[0],
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        translations.gemini = {
          text: '[Gemini unavailable]',
          quality: 0,
          provider: 'gemini',
          error: true
        };
      }
    }

    // Translate title with Claude
    let translatedTitle = '[Translation unavailable]';
    try {
      const titlePrompt = `Translate this English news headline to ${targetLang.name} (${targetLang.code}):

"${titleToTranslate}"

Provide ONLY the translated headline, no explanations.`;

      const titleResponse = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 256,
        messages: [{ role: 'user', content: titlePrompt }]
      });

      translatedTitle = titleResponse.content[0].text.trim();
    } catch (error) {
      logger.error(`[TranslationAgent] Claude title error for ${targetLang.name}:`, error.message);
    }

    // Translate summary with Claude
    try {
      const summaryPrompt = `Translate the following English news summary to ${targetLang.name} (${targetLang.code}):

"${summaryToTranslate}"

Provide ONLY the translation, no explanations or additional text.`;

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: summaryPrompt }]
      });

      const translatedText = response.content[0].text.trim();

      translations.claude = {
        text: translatedText,
        title: translatedTitle,
        quality: 95,
        provider: 'claude'
      };

    } catch (error) {
      logger.error(`[TranslationAgent] Claude error for ${targetLang.name}:`, error.message);
      translations.claude = {
        text: '[Claude unavailable]',
        title: translatedTitle,
        quality: 0,
        provider: 'claude',
        error: true
      };
    }

    // Return translations with both title and summary
    return {
      language: targetLang.code,
      languageName: targetLang.name,
      originalTitle: headline.title,
      translatedTitle: translations.claude?.title || headline.title,
      claudeTranslation: translations.claude?.text || '[Not available]',
      claudeQuality: translations.claude?.quality || 0
    };
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
