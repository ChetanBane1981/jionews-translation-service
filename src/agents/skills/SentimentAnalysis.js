import { logger } from '../../utils/logger.js';

/**
 * SentimentAnalysis Skill
 * Analyze sentiment, emotion, and tone of text content
 * Score: -100 (very negative) to +100 (very positive)
 */
export class SentimentAnalysisSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'sentimentAnalysis';
  }

  /**
   * Execute sentiment analysis
   * @param {Object} input - { text, analyzeEmotion, analyzeTone }
   * @param {Object} options
   * @returns {Promise<Object>} - { score, emotion, tone, reasoning }
   */
  async execute(input, options = {}) {
    const { text, analyzeEmotion = true, analyzeTone = true } = input;

    if (!text) {
      throw new Error('Text is required for sentiment analysis');
    }

    logger.debug(`[${this.agent.name}] Analyzing sentiment for text (${text.length} chars)`);

    // Use AI service provider if available
    if (this.agent.aiServiceProvider) {
      return this.analyzeWithAI(text, analyzeEmotion, analyzeTone);
    }

    // Fallback to heuristic-based analysis
    return this.analyzeHeuristic(text, analyzeEmotion, analyzeTone);
  }

  /**
   * Analyze sentiment using AI service
   * @param {string} text
   * @param {boolean} analyzeEmotion
   * @param {boolean} analyzeTone
   * @returns {Promise<Object>}
   */
  async analyzeWithAI(text, analyzeEmotion, analyzeTone) {
    const prompt = `Analyze the sentiment of the following text:

Text: ${text}

Provide:
1. Sentiment score (-100 to 100, where -100 is very negative, 0 is neutral, 100 is very positive)
${analyzeEmotion ? '2. Primary emotion (joy, anger, fear, surprise, sadness, neutral)' : ''}
${analyzeTone ? '3. Tone (formal, casual, urgent, promotional, informative)' : ''}
4. Brief reasoning

Return as JSON with keys: score, ${analyzeEmotion ? 'emotion, ' : ''}${analyzeTone ? 'tone, ' : ''}reasoning`;

    try {
      const result = await this.agent.aiServiceProvider.extractStructuredData(text.substring(0, 2000), {
        score: 'number between -100 and 100',
        emotion: 'string: joy, anger, fear, surprise, sadness, or neutral',
        tone: 'string: formal, casual, urgent, promotional, or informative',
        reasoning: 'string'
      });

      return {
        score: Math.max(-100, Math.min(100, result.score || 0)),
        emotion: result.emotion || 'neutral',
        tone: result.tone || 'informative',
        reasoning: result.reasoning || 'AI analysis',
        method: 'ai'
      };

    } catch (error) {
      logger.warn(`[${this.agent.name}] AI sentiment analysis failed, falling back to heuristic:`, error.message);
      return this.analyzeHeuristic(text, analyzeEmotion, analyzeTone);
    }
  }

  /**
   * Heuristic-based sentiment analysis
   * @param {string} text
   * @param {boolean} analyzeEmotion
   * @param {boolean} analyzeTone
   * @returns {Object}
   */
  analyzeHeuristic(text, analyzeEmotion, analyzeTone) {
    const lowerText = text.toLowerCase();

    // Positive and negative word lists
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'love', 'best', 'happy', 'perfect', 'awesome', 'brilliant',
      'success', 'win', 'victory', 'breakthrough', 'achievement'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate',
      'fail', 'failure', 'disaster', 'crisis', 'problem', 'issue',
      'death', 'kill', 'destroy', 'collapse', 'scandal', 'corrupt'
    ];

    // Count positive and negative words
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeCount += matches.length;
    });

    // Calculate score
    const totalWords = lowerText.split(/\s+/).length;
    const netSentiment = positiveCount - negativeCount;
    const score = Math.max(-100, Math.min(100, (netSentiment / Math.max(totalWords / 10, 1)) * 100));

    // Determine emotion (if requested)
    let emotion = 'neutral';
    if (analyzeEmotion) {
      if (score > 50) emotion = 'joy';
      else if (score < -50) emotion = 'sadness';
      else if (lowerText.includes('angry') || lowerText.includes('outrage')) emotion = 'anger';
      else if (lowerText.includes('fear') || lowerText.includes('scared')) emotion = 'fear';
      else if (lowerText.includes('surprise') || lowerText.includes('shocking')) emotion = 'surprise';
    }

    // Determine tone (if requested)
    let tone = 'informative';
    if (analyzeTone) {
      if (lowerText.includes('urgent') || lowerText.includes('breaking')) tone = 'urgent';
      else if (lowerText.includes('buy') || lowerText.includes('offer') || lowerText.includes('sale')) tone = 'promotional';
      else if (/\b(sir|madam|kindly|respectfully)\b/.test(lowerText)) tone = 'formal';
      else if (/\b(hey|wow|lol|yeah)\b/.test(lowerText)) tone = 'casual';
    }

    return {
      score: Math.round(score),
      emotion,
      tone,
      reasoning: `Heuristic analysis: ${positiveCount} positive, ${negativeCount} negative words`,
      method: 'heuristic',
      details: {
        positiveCount,
        negativeCount,
        totalWords
      }
    };
  }

  /**
   * Batch analyze multiple texts
   * @param {Array<string>} texts
   * @returns {Promise<Array<Object>>}
   */
  async analyzeBatch(texts) {
    const promises = texts.map(text => this.execute({ text }));
    return Promise.all(promises);
  }
}

export default SentimentAnalysisSkill;
