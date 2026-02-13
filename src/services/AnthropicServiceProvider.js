import Anthropic from '@anthropic-ai/sdk';
import { AIServiceProvider } from './ServiceProvider.js';
import { logger } from '../utils/logger.js';

/**
 * AnthropicServiceProvider - Claude AI integration
 * Supports: text generation, structured extraction, function calling
 */
export class AnthropicServiceProvider extends AIServiceProvider {
  constructor(config = {}) {
    super('anthropic', config);

    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey
    });
  }

  /**
   * Execute a Claude API request
   * @param {string} prompt - User prompt
   * @param {Object} config - Request configuration
   * @returns {Promise<string>} - Claude's response
   */
  async execute(prompt, config = {}) {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: config.model || this.model,
        max_tokens: config.maxTokens || this.maxTokens,
        temperature: config.temperature ?? this.temperature,
        system: config.system || undefined,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const latency = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = this.estimateCost(inputTokens, outputTokens);

      this.trackMetrics(true, latency, cost);

      // Extract text content
      const textContent = response.content.find(block => block.type === 'text');
      return textContent?.text || '';

    } catch (error) {
      const latency = Date.now() - startTime;
      this.trackMetrics(false, latency);

      logger.error(`[${this.name}] API request failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate with streaming support
   * @param {string} prompt
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} config
   * @returns {Promise<string>}
   */
  async generateStream(prompt, onChunk, config = {}) {
    const startTime = Date.now();

    try {
      const stream = await this.client.messages.create({
        model: config.model || this.model,
        max_tokens: config.maxTokens || this.maxTokens,
        temperature: config.temperature ?? this.temperature,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          fullText += chunk;
          if (onChunk) onChunk(chunk);
        }
      }

      const latency = Date.now() - startTime;
      this.trackMetrics(true, latency);

      return fullText;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.trackMetrics(false, latency);
      throw error;
    }
  }

  /**
   * Extract structured data using Claude
   * @param {string} text - Text to analyze
   * @param {Object} schema - Expected output schema
   * @returns {Promise<Object>}
   */
  async extractStructuredData(text, schema) {
    const systemPrompt = `You are a data extraction expert. Extract structured data from the provided text according to the given schema. Return ONLY valid JSON matching the schema exactly.`;

    const prompt = `Schema:\n${JSON.stringify(schema, null, 2)}\n\nText to analyze:\n${text}\n\nExtract the data as JSON:`;

    const response = await this.execute(prompt, {
      system: systemPrompt,
      temperature: 0.3 // Lower temperature for structured output
    });

    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error(`[${this.name}] Failed to parse structured data:`, error.message);
      logger.debug('Response:', response);
      throw new Error('Invalid JSON response from Claude');
    }
  }

  /**
   * Analyze sentiment of text
   * @param {string} text
   * @returns {Promise<Object>} - { score, emotion, tone, reasoning }
   */
  async analyzeSentiment(text) {
    const schema = {
      score: 'number between -100 (very negative) and 100 (very positive)',
      emotion: 'one of: joy, anger, fear, surprise, sadness, neutral',
      tone: 'one of: formal, casual, urgent, promotional, informative',
      reasoning: 'brief explanation'
    };

    return this.extractStructuredData(text, schema);
  }

  /**
   * Extract named entities
   * @param {string} text
   * @returns {Promise<Object>} - { people, places, organizations, topics, keywords }
   */
  async extractEntities(text) {
    const schema = {
      people: 'array of person names',
      places: 'array of locations',
      organizations: 'array of companies/organizations',
      topics: 'array of main topics',
      keywords: 'array of key phrases'
    };

    return this.extractStructuredData(text, schema);
  }

  /**
   * Summarize text
   * @param {string} text
   * @param {number} maxLength - Max summary length in words
   * @returns {Promise<string>}
   */
  async summarize(text, maxLength = 100) {
    const prompt = `Summarize the following text in ${maxLength} words or less:\n\n${text}`;

    return this.execute(prompt, {
      temperature: 0.5,
      maxTokens: Math.ceil(maxLength * 1.5) // Rough token estimate
    });
  }

  /**
   * Estimate cost for Claude API usage
   * Pricing as of 2025:
   * - Sonnet 4.5: $3/MTok input, $15/MTok output
   * - Haiku 4.5: $0.80/MTok input, $4/MTok output
   * - Opus 4.6: $15/MTok input, $75/MTok output
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @returns {number} - Cost in USD
   */
  estimateCost(inputTokens, outputTokens) {
    // Pricing per million tokens
    const pricing = {
      'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
      'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
      'claude-opus-4-6': { input: 15, output: 75 }
    };

    const modelPricing = pricing[this.model] || pricing['claude-sonnet-4-5-20250929'];

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Validate configuration
   * @returns {boolean}
   */
  validateConfig() {
    return !!(this.apiKey && this.model);
  }

  /**
   * Test connection to Anthropic API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.execute('Hello', { maxTokens: 10 });
      logger.info(`[${this.name}] Connection test successful`);
      return true;
    } catch (error) {
      logger.error(`[${this.name}] Connection test failed:`, error.message);
      return false;
    }
  }
}

export default AnthropicServiceProvider;
