const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const connectDB = require('./config/database');
const Headline = require('./models/Headline');
const { fetchAndStoreHeadlines } = require('./services/rssFetcher');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

// Helper function to call Claude API
async function callClaude(prompt) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    return message.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

// Endpoint to fetch RSS and store in MongoDB
app.post('/api/fetch-rss', async (req, res) => {
  try {
    console.log('🔄 Fetching RSS feed and storing in MongoDB...');
    const result = await fetchAndStoreHeadlines();

    res.json({
      success: true,
      message: 'RSS feed fetched and stored successfully',
      stats: result
    });
  } catch (error) {
    console.error('Error fetching RSS:', error);
    res.status(500).json({
      error: 'Failed to fetch RSS feed',
      details: error.message
    });
  }
});

// Endpoint to get all headlines from MongoDB
app.get('/api/headlines', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const headlines = await Headline.find()
      .sort({ pubDate: -1 })
      .limit(limit)
      .skip(skip)
      .select('_id title description category creator pubDate imageUrl link');

    const total = await Headline.countDocuments();

    res.json({
      headlines,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching headlines:', error);
    res.status(500).json({
      error: 'Failed to fetch headlines',
      details: error.message
    });
  }
});

// Endpoint to get a single headline by ID
app.get('/api/headlines/:id', async (req, res) => {
  try {
    const headline = await Headline.findById(req.params.id);

    if (!headline) {
      return res.status(404).json({ error: 'Headline not found' });
    }

    res.json(headline);
  } catch (error) {
    console.error('Error fetching headline:', error);
    res.status(500).json({
      error: 'Failed to fetch headline',
      details: error.message
    });
  }
});

// Endpoint to process a single headline (summarize + translate)
app.post('/api/process-headline', async (req, res) => {
  try {
    const { headlineId, targetLanguage = 'Hindi' } = req.body;

    if (!headlineId) {
      return res.status(400).json({ error: 'headlineId is required' });
    }

    // Fetch headline from MongoDB
    const headlineDoc = await Headline.findById(headlineId);

    if (!headlineDoc) {
      return res.status(404).json({ error: 'Headline not found' });
    }

    const headlineText = headlineDoc.title;

    // Step 1: Summarize the headline
    const summarizePrompt = `Summarize the following news headline into a concise summary of exactly 60 words. Focus on the key facts and main points.

Headline: "${headlineText}"

Provide only the 60-word summary, nothing else.`;

    const summary = await callClaude(summarizePrompt);

    // Step 2: Translate the summary
    const translatePrompt = `Translate the following English text into ${targetLanguage}. Maintain the same tone and meaning. Keep it exactly 60 words in the target language.

Text to translate: "${summary}"

Provide only the translation, nothing else.`;

    const translation = await callClaude(translatePrompt);

    res.json({
      id: headlineDoc._id,
      original: headlineText,
      summary: summary.trim(),
      translation: translation.trim(),
      targetLanguage,
      category: headlineDoc.category,
      creator: headlineDoc.creator,
      pubDate: headlineDoc.pubDate,
      imageUrl: headlineDoc.imageUrl
    });

  } catch (error) {
    console.error('Error processing headline:', error);
    res.status(500).json({
      error: 'Failed to process headline',
      details: error.message
    });
  }
});

// Endpoint to batch process multiple headlines
app.post('/api/process-batch', async (req, res) => {
  try {
    const { headlineIds, targetLanguage = 'Hindi' } = req.body;

    if (!headlineIds || !Array.isArray(headlineIds)) {
      return res.status(400).json({ error: 'headlineIds array is required' });
    }

    // Fetch headlines from MongoDB
    const selectedHeadlines = await Headline.find({
      _id: { $in: headlineIds }
    });

    if (selectedHeadlines.length === 0) {
      return res.status(404).json({ error: 'No headlines found' });
    }

    const results = await Promise.all(
      selectedHeadlines.map(async (item) => {
        try {
          // Summarize
          const summarizePrompt = `Summarize the following news headline into a concise summary of exactly 60 words. Focus on the key facts and main points.

Headline: "${item.title}"

Provide only the 60-word summary, nothing else.`;

          const summary = await callClaude(summarizePrompt);

          // Translate
          const translatePrompt = `Translate the following English text into ${targetLanguage}. Maintain the same tone and meaning. Keep it exactly 60 words in the target language.

Text to translate: "${summary}"

Provide only the translation, nothing else.`;

          const translation = await callClaude(translatePrompt);

          return {
            id: item._id,
            category: item.category,
            creator: item.creator,
            original: item.title,
            summary: summary.trim(),
            translation: translation.trim(),
            targetLanguage,
            pubDate: item.pubDate,
            imageUrl: item.imageUrl
          };
        } catch (error) {
          console.error(`Error processing headline ${item._id}:`, error);
          return {
            id: item._id,
            error: 'Processing failed',
            original: item.title
          };
        }
      })
    );

    res.json({ results });

  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({
      error: 'Failed to process batch',
      details: error.message
    });
  }
});

// Database stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Headline.countDocuments();
    const categories = await Headline.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const latestHeadline = await Headline.findOne().sort({ pubDate: -1 });

    res.json({
      totalHeadlines: total,
      categories,
      latestHeadline: latestHeadline ? {
        title: latestHeadline.title,
        pubDate: latestHeadline.pubDate
      } : null
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      status: 'healthy',
      service: 'jionews-translation-service',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 JioNews Translation Service running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`💾 MongoDB integration enabled`);
  console.log(`\n📝 Quick Start:`);
  console.log(`   1. POST /api/fetch-rss - Fetch headlines from RSS feed`);
  console.log(`   2. GET /api/headlines - View all headlines`);
  console.log(`   3. POST /api/process-batch - Process and translate\n`);
});
