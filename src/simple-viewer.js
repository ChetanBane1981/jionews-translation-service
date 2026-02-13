import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Orchestrator } from './orchestrator/index.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = 3000;

// Store fetched news in memory
const newsCache = [];
const MAX_CACHE_SIZE = 100;

// Initialize orchestrator
const orchestrator = new Orchestrator();

// Listen for fetched headlines and process them through pipeline
orchestrator.on('orchestrator:ready', () => {
  const feedAgent = orchestrator.agents.get('feed');

  feedAgent.on('headline:fetched', async (headline) => {
    try {
      logger.info(`[Viewer] Processing headline: ${headline.title}`);

      // Process through agents directly (skip feed agent since headline is already fetched)
      let currentData = { headline };

      // Define processing pipeline (excluding feed agent)
      const processingPipeline = ['detection', 'summary', 'translation'];

      for (const agentName of processingPipeline) {
        const agent = orchestrator.agents.get(agentName);
        if (!agent) continue;

        try {
          const agentResult = await agent.processTask(currentData);
          if (agentResult.success) {
            // Merge the result back
            currentData = { ...currentData, ...agentResult.result };
          } else {
            logger.warn(`[Viewer] Agent ${agentName} failed for: ${headline.title}`);
            break;
          }
        } catch (error) {
          logger.error(`[Viewer] Error in ${agentName}:`, error.message);
          break;
        }
      }

      const result = { success: true, data: currentData };

      if (result.success) {
        // currentData contains all the merged results from the pipeline
        const processedData = currentData;
        const processedHeadline = processedData.headline || {};

        // Merge everything together for caching
        const cacheEntry = {
          ...headline,
          ...processedHeadline,
          ...processedData,
          fetchedAt: new Date(),
          processed: true
        };

        // Add processed data to cache
        newsCache.unshift(cacheEntry);

        logger.info(`[Viewer] ✅ Successfully processed: ${headline.title}`);
        if (cacheEntry.translations && cacheEntry.translations.length > 0) {
          logger.info(`[Viewer] 📚 Cached ${cacheEntry.translations.length} translations`);
        }
        if (cacheEntry.aiSummary || cacheEntry.summary) {
          logger.info(`[Viewer] 📝 Summary: ${cacheEntry.summaryWordCount} words`);
        }
      } else {
        // If pipeline fails, still cache the original headline
        newsCache.unshift({
          ...headline,
          fetchedAt: new Date(),
          processed: false,
          error: result.error
        });
        logger.warn(`[Viewer] ⚠️ Pipeline failed for: ${headline.title}`);
      }

      // Limit cache size
      if (newsCache.length > MAX_CACHE_SIZE) {
        newsCache.pop();
      }

    } catch (error) {
      logger.error(`[Viewer] Error processing headline:`, error.message);
    }
  });

  // Listen for completed pipeline items
  orchestrator.on('pipeline:completed', (processedNews) => {
    logger.info(`[Viewer] 🎉 Pipeline completed for: ${processedNews.title}`);
  });
});

// Routes
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JioNews Live Feed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }
        h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }
        .stat-box {
            background: #f8f9fa;
            padding: 15px 25px;
            border-radius: 10px;
            flex: 1;
        }
        .stat-number {
            font-size: 2em;
            color: #667eea;
            font-weight: bold;
        }
        .stat-label {
            color: #6c757d;
            margin-top: 5px;
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .news-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeIn 0.5s ease-in;
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .news-source {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            margin-bottom: 15px;
            font-weight: 500;
        }
        .news-title {
            font-size: 1.3em;
            color: #2c3e50;
            margin-bottom: 12px;
            font-weight: 600;
            line-height: 1.4;
        }
        .news-description {
            color: #6c757d;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
            font-size: 0.9em;
            color: #6c757d;
        }
        .news-time {
            font-style: italic;
        }
        .news-link {
            background: #667eea;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            text-decoration: none;
            transition: background 0.3s ease;
        }
        .news-link:hover {
            background: #764ba2;
        }
        .refresh-btn {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }
        .refresh-btn:hover {
            background: #667eea;
            color: white;
        }
        .live-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #28a745;
            border-radius: 50%;
            animation: pulse 2s infinite;
            margin-left: 10px;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
    </script>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔴 JioNews Live Feed <span class="live-indicator"></span></h1>
            <p style="color: #6c757d; margin-top: 10px; font-size: 1.1em;">
                🤖 Fully Automated • Real-time news from 2 publishers (CNN & BBC) • Auto-refresh every 30s
            </p>
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">${newsCache.length}</div>
                    <div class="stat-label">Headlines Processed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">8</div>
                    <div class="stat-label">Languages (Claude AI)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">60</div>
                    <div class="stat-label">Word Summaries</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">LIVE</div>
                    <div class="stat-label">Automated Status</div>
                </div>
            </div>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Now</button>
        </header>

        <div class="news-grid">
            ${newsCache.slice(0, 20).map(news => `
                <div class="news-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span class="news-source">${news.source || news.sourceName}</span>
                        ${news.processed ? '<span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.75em;">✓ PROCESSED</span>' : ''}
                    </div>
                    <div class="news-title">${news.title}</div>

                    ${news.aiSummary ? `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #667eea;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong style="color: #667eea; font-size: 0.9em;">📝 AI SUMMARY (Claude)</strong>
                                ${news.summaryWordCount ? `<span style="background: #667eea; color: white; padding: 3px 10px; border-radius: 10px; font-size: 0.75em;">${news.summaryWordCount} words</span>` : ''}
                            </div>
                            <p style="margin-top: 8px; color: #495057; line-height: 1.6;">${news.aiSummary}</p>
                        </div>
                    ` : news.description ? `<div class="news-description">${news.description.substring(0, 150)}...</div>` : ''}

                    ${news.translations && news.translations.length > 0 ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                            <strong style="color: #667eea; font-size: 0.9em; display: block; margin-bottom: 10px;">🌐 TRANSLATIONS (${news.translations.length} languages)</strong>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #667eea; font-weight: 500;">View Translations</summary>
                                <div style="margin-top: 10px; max-height: 300px; overflow-y: auto;">
                                    ${news.translations.slice(0, 5).map(t => `
                                        <div style="background: #f8f9fa; padding: 10px; margin: 8px 0; border-radius: 8px;">
                                            <strong style="color: #667eea;">${t.languageName || t.language}</strong>
                                            <p style="margin-top: 5px; color: #495057; font-size: 0.9em;">${t.summary || t.title}</p>
                                            ${t.quality ? `<span style="font-size: 0.8em; color: #6c757d;">Quality: ${t.quality}%</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        </div>
                    ` : ''}

                    ${news.credibilityScore ? `
                        <div style="margin-top: 10px; font-size: 0.9em;">
                            <span style="color: ${news.credibilityScore > 75 ? '#28a745' : news.credibilityScore > 50 ? '#ffc107' : '#dc3545'};">
                                🎯 Credibility: ${news.credibilityScore}%
                            </span>
                        </div>
                    ` : ''}

                    <div class="news-meta">
                        <span class="news-time">⏱ ${new Date(news.fetchedAt).toLocaleTimeString()}</span>
                        ${news.url ? `<a href="${news.url}" target="_blank" class="news-link">Read More →</a>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${newsCache.length === 0 ? '<p style="color: white; text-align: center; margin-top: 50px; font-size: 1.2em;">⏳ Waiting for news... The feed agent is fetching headlines every minute.</p>' : ''}
    </div>
</body>
</html>
  `;

  res.send(html);
});

// API endpoint
app.get('/api/news', (req, res) => {
  res.json({
    success: true,
    count: newsCache.length,
    news: newsCache.slice(0, 50)
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    newsCount: newsCache.length,
    orchestratorRunning: orchestrator.isRunning
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`[Viewer] Server running on http://localhost:${PORT}`);
  logger.info(`[Viewer] Open your browser to view live news feed`);
});

// Start orchestrator
orchestrator.start().catch((error) => {
  logger.error('[Viewer] Failed to start orchestrator:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('[Viewer] Shutting down...');
  await orchestrator.shutdown();
  process.exit(0);
});
