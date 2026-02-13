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
    <title>JioNews Sentinel - AI-Powered News Intelligence</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            min-height: 100vh;
            padding: 0;
        }
        .top-bar {
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .top-bar-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .logo-icon {
            width: 45px;
            height: 45px;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
        }
        .logo-text h1 {
            color: white;
            font-size: 1.8em;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .logo-text p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85em;
            margin-top: 2px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
        }
        .dashboard-header {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 35px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .header-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
        }
        .header-title h2 {
            color: white;
            font-size: 1.6em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .live-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.85em;
            color: #22c55e;
            font-weight: 600;
        }
        .live-indicator {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            50% { opacity: 0.6; box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 15px;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-2px);
        }
        .stat-number {
            font-size: 2.2em;
            color: #0ea5e9;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .stat-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9em;
            font-weight: 500;
        }
        .stat-icon {
            font-size: 1.3em;
            margin-bottom: 10px;
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 25px;
        }
        .news-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 28px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            animation: fadeIn 0.6s ease-in;
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
            border-color: rgba(14, 165, 233, 0.3);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
        }
        .news-source {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.82em;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        }
        .processed-badge {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 0.75em;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
        }
        .news-title {
            font-size: 1.35em;
            color: #1e293b;
            margin-bottom: 15px;
            font-weight: 700;
            line-height: 1.5;
        }
        .summary-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-left: 4px solid #0ea5e9;
            padding: 18px;
            border-radius: 12px;
            margin: 18px 0;
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
        }
        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .summary-title {
            color: #0369a1;
            font-size: 0.9em;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .word-count-badge {
            background: #0ea5e9;
            color: white;
            padding: 4px 10px;
            border-radius: 10px;
            font-size: 0.75em;
            font-weight: 600;
        }
        .summary-text {
            color: #334155;
            line-height: 1.7;
            font-size: 0.95em;
        }
        .translation-section {
            margin-top: 18px;
            padding-top: 18px;
            border-top: 2px solid #e2e8f0;
        }
        .translation-header {
            color: #0369a1;
            font-size: 0.95em;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .translation-details {
            cursor: pointer;
        }
        .translation-summary {
            color: #0ea5e9;
            font-weight: 600;
            font-size: 0.95em;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            background: rgba(14, 165, 233, 0.05);
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .translation-summary:hover {
            background: rgba(14, 165, 233, 0.1);
        }
        .translation-content {
            margin-top: 15px;
            max-height: 500px;
            overflow-y: auto;
            padding-right: 10px;
        }
        .translation-content::-webkit-scrollbar {
            width: 6px;
        }
        .translation-content::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
        }
        .translation-content::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 10px;
        }
        .language-comparison {
            background: #f8fafc;
            padding: 18px;
            margin: 12px 0;
            border-radius: 12px;
            border-left: 4px solid #0ea5e9;
        }
        .language-name {
            color: #0369a1;
            font-size: 1.1em;
            font-weight: 700;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .ai-translation-box {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border-left: 3px solid transparent;
        }
        .gemini-box {
            border-left-color: #4285f4;
        }
        .claude-box {
            border-left-color: #0ea5e9;
        }
        .ai-provider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .ai-provider-badge {
            padding: 5px 14px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 700;
            color: white;
        }
        .gemini-badge {
            background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
            box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
        }
        .claude-badge {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        }
        .quality-badge {
            font-size: 0.8em;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 8px;
        }
        .quality-high {
            color: #16a34a;
            background: #dcfce7;
        }
        .quality-medium {
            color: #ea580c;
            background: #ffedd5;
        }
        .translation-text {
            color: #1e293b;
            font-size: 0.95em;
            line-height: 1.7;
        }
        .comparison-note {
            text-align: center;
            margin-top: 12px;
            padding: 10px;
            background: #fef3c7;
            border-radius: 8px;
            border: 1px solid #fbbf24;
        }
        .comparison-note-text {
            font-size: 0.85em;
            color: #92400e;
            font-weight: 600;
        }
        .global-language-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            margin-top: 20px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 15px;
        }
        .selector-label {
            color: white;
            font-weight: 700;
            font-size: 1em;
            margin-right: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .lang-btn {
            padding: 10px 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            border-radius: 25px;
            font-size: 0.9em;
            font-weight: 600;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .lang-btn:hover {
            border-color: #0ea5e9;
            background: rgba(14, 165, 233, 0.2);
            transform: translateY(-2px);
        }
        .lang-btn.active {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            border-color: #0ea5e9;
            box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
            transform: translateY(-2px);
        }
        .language-comparison {
            transition: all 0.3s ease;
        }
        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 18px;
            margin-top: 18px;
            border-top: 2px solid #e2e8f0;
        }
        .news-time {
            color: #64748b;
            font-size: 0.9em;
            font-weight: 500;
        }
        .news-link {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            padding: 10px 22px;
            border-radius: 20px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9em;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        }
        .news-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
        }
        .refresh-btn {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 25px;
            font-size: 1em;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
        }
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
        }
        .empty-state {
            text-align: center;
            padding: 80px 20px;
            color: rgba(255, 255, 255, 0.7);
        }
        .empty-state-icon {
            font-size: 4em;
            margin-bottom: 20px;
        }
        .empty-state-text {
            font-size: 1.3em;
            font-weight: 500;
        }
    </style>
    <script>
        // Save and load selected language
        function getCurrentLanguage() {
            return localStorage.getItem('selectedLanguage') || 'all';
        }

        function saveLanguage(language) {
            localStorage.setItem('selectedLanguage', language);
        }

        // Auto-refresh every 30 seconds, preserving language selection
        setTimeout(() => {
            location.reload();
        }, 30000);

        // Global language filter functionality
        function filterAllByLanguage(language) {
            saveLanguage(language);

            const allLangs = document.querySelectorAll('.language-comparison');
            const langButtons = document.querySelectorAll('.lang-btn');

            // Reset all buttons
            langButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll(\`[data-lang="\${language}"]\`).forEach(btn => btn.classList.add('active'));

            if (language === 'all') {
                // Show all languages
                allLangs.forEach(lang => lang.style.display = 'block');
            } else {
                // Show only selected language across ALL cards
                allLangs.forEach(lang => {
                    if (lang.dataset.language === language) {
                        lang.style.display = 'block';
                    } else {
                        lang.style.display = 'none';
                    }
                });
            }
        }

        // Apply saved language on page load
        window.addEventListener('DOMContentLoaded', function() {
            const savedLang = getCurrentLanguage();
            filterAllByLanguage(savedLang);
        });
    </script>
</head>
<body>
    <div class="top-bar">
        <div class="top-bar-content">
            <div class="logo">
                <div class="logo-icon">JS</div>
                <div class="logo-text">
                    <h1>JioNews Sentinel</h1>
                    <p>AI-Powered News Intelligence Platform</p>
                </div>
            </div>
            <div class="live-badge">
                <span class="live-indicator"></span>
                LIVE
            </div>
        </div>
    </div>

    <div class="container">
        <div class="dashboard-header">
            <div class="header-title">
                <h2>
                    📊 Real-Time Analytics Dashboard
                </h2>
                <button class="refresh-btn" onclick="location.reload()">
                    🔄 Refresh Now
                </button>
            </div>
            <p style="color: rgba(255, 255, 255, 0.8); font-size: 1.05em; margin-bottom: 20px;">
                AI-powered translations • 8 Indian languages • 60-word summaries • Real-time news feeds • Auto-refresh every 30s
            </p>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📰</div>
                    <div class="stat-number">${newsCache.length}</div>
                    <div class="stat-label">Headlines Processed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🌐</div>
                    <div class="stat-number">8</div>
                    <div class="stat-label">Languages</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🤖</div>
                    <div class="stat-number">Claude AI</div>
                    <div class="stat-label">Translation Engine</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-number">60</div>
                    <div class="stat-label">Word Summaries</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-number">LIVE</div>
                    <div class="stat-label">Auto-Refresh</div>
                </div>
            </div>

            <!-- Global Language Selector -->
            <div class="global-language-selector">
                <span class="selector-label">🌐 Select Language:</span>
                <button class="lang-btn active" data-lang="all" onclick="filterAllByLanguage('all')">All Languages</button>
                <button class="lang-btn" data-lang="hi" onclick="filterAllByLanguage('hi')">Hindi</button>
                <button class="lang-btn" data-lang="ta" onclick="filterAllByLanguage('ta')">Tamil</button>
                <button class="lang-btn" data-lang="te" onclick="filterAllByLanguage('te')">Telugu</button>
                <button class="lang-btn" data-lang="bn" onclick="filterAllByLanguage('bn')">Bengali</button>
                <button class="lang-btn" data-lang="mr" onclick="filterAllByLanguage('mr')">Marathi</button>
                <button class="lang-btn" data-lang="gu" onclick="filterAllByLanguage('gu')">Gujarati</button>
                <button class="lang-btn" data-lang="kn" onclick="filterAllByLanguage('kn')">Kannada</button>
                <button class="lang-btn" data-lang="ml" onclick="filterAllByLanguage('ml')">Malayalam</button>
            </div>
        </div>

        <div class="news-grid">
            ${newsCache.slice(0, 20).map(news => `
                <div class="news-card">
                    <div class="card-header">
                        <span class="news-source">${news.source || news.sourceName}</span>
                        ${news.processed ? '<span class="processed-badge">✓ PROCESSED</span>' : ''}
                    </div>

                    <!-- English Headline -->
                    <div style="margin-bottom: 8px;">
                        <span style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.75em; font-weight: 600;">🇬🇧 ENGLISH</span>
                    </div>
                    <div class="news-title">${news.title}</div>

                    <!-- English Summary -->
                    ${news.aiSummary ? `
                        <div class="summary-box">
                            <div class="summary-header">
                                <span class="summary-title">📝 AI SUMMARY</span>
                                ${news.summaryWordCount ? `<span class="word-count-badge">${news.summaryWordCount} words</span>` : ''}
                            </div>
                            <p class="summary-text">${news.aiSummary}</p>
                        </div>
                    ` : ''}

                    ${news.translations && news.translations.length > 0 ? `
                        <div class="translation-section">
                            <div class="translation-header">
                                🌐 AI TRANSLATIONS (${news.translations.length} languages)
                            </div>

                            <details class="translation-details" open>
                                <summary class="translation-summary">
                                    📊 View Translations (Claude AI)
                                </summary>
                                <div class="translation-content">
                                    ${news.translations.slice(0, 8).map(t => `
                                        <div class="language-comparison" data-language="${t.language}">
                                            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #0ea5e9;">
                                                <!-- Language Badge -->
                                                <div style="margin-bottom: 15px;">
                                                    <span class="ai-provider-badge claude-badge">📍 ${t.languageName || t.language}</span>
                                                    ${t.claudeQuality ? `<span class="quality-badge ${t.claudeQuality > 90 ? 'quality-high' : 'quality-medium'}">Quality: ${t.claudeQuality}%</span>` : ''}
                                                </div>

                                                <!-- Translated Headline -->
                                                <div style="margin-bottom: 15px;">
                                                    <div style="color: #0369a1; font-size: 0.85em; font-weight: 700; margin-bottom: 8px;">📰 TRANSLATED HEADLINE</div>
                                                    <div style="font-size: 1.2em; color: #1e293b; font-weight: 700; line-height: 1.5;">
                                                        ${t.translatedTitle || news.title}
                                                    </div>
                                                </div>

                                                <!-- Translated Summary -->
                                                <div>
                                                    <div style="color: #0369a1; font-size: 0.85em; font-weight: 700; margin-bottom: 8px;">📝 TRANSLATED SUMMARY</div>
                                                    <p class="translation-text">${t.claudeTranslation || '[Not available]'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        </div>
                    ` : ''}


                    <div class="news-meta">
                        <span class="news-time">⏱ ${new Date(news.fetchedAt).toLocaleTimeString()}</span>
                        ${news.url ? `<a href="${news.url}" target="_blank" class="news-link">Read Full Article →</a>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${newsCache.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <p class="empty-state-text">Initializing AI pipeline... Fetching headlines from CNN & BBC RSS feeds</p>
            </div>
        ` : ''}
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
