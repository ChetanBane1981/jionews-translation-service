import express from 'express';
import cors from 'cors';
import { logger } from '../utils/logger.js';
import { database } from '../utils/database.js';
import { queueManager } from '../services/queue.js';
import { healthMonitor } from '../monitoring/health.js';
import { NewsItem, UserProfile, AgentLog } from '../models/index.js';

/**
 * REST API Server for JioNews Sentinel
 */
class APIServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.server = null;
  }

  /**
   * Initialize middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const health = await healthMonitor.runAllChecks();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // News endpoints
    this.app.get('/api/news', async (req, res) => {
      try {
        const { category, limit = 20, page = 1 } = req.query;

        const query = { published: true };
        if (category) query.category = category;

        const news = await NewsItem.find(query)
          .sort({ publishedAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await NewsItem.countDocuments(query);

        res.json({
          success: true,
          data: news,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        });

      } catch (error) {
        logger.error('[API] Error fetching news:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Breaking news
    this.app.get('/api/news/breaking', async (req, res) => {
      try {
        const breakingNews = await NewsItem.findBreakingNews();
        res.json({ success: true, data: breakingNews });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // News by category
    this.app.get('/api/news/category/:category', async (req, res) => {
      try {
        const { category } = req.params;
        const { limit = 20 } = req.query;

        const news = await NewsItem.findByCategory(category)
          .limit(parseInt(limit));

        res.json({ success: true, data: news });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Personalized feed
    this.app.get('/api/news/personalized/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        // Get user profile
        const user = await UserProfile.findOne({ userId });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userType = user.userType || 'general';

        // Get personalized news
        const news = await NewsItem.find({
          published: true,
          [`personalizedVersions.${userType}`]: { $exists: true }
        })
          .sort({ relevanceScore: -1, publishedAt: -1 })
          .limit(parseInt(limit));

        res.json({ success: true, data: news, userType });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Approval queue
    this.app.get('/api/approval-queue', async (req, res) => {
      try {
        const pendingApproval = await NewsItem.findPendingApproval();
        res.json({ success: true, data: pendingApproval });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Approve/reject news
    this.app.post('/api/approval/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { action, approver, reason } = req.body;

        const newsItem = await NewsItem.findOne({ id });
        if (!newsItem) {
          return res.status(404).json({ error: 'News item not found' });
        }

        if (action === 'approve') {
          await newsItem.approve(approver);
          res.json({ success: true, message: 'News item approved' });
        } else if (action === 'reject') {
          await newsItem.reject(approver, reason);
          res.json({ success: true, message: 'News item rejected' });
        } else {
          res.status(400).json({ error: 'Invalid action' });
        }

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Agent status
    this.app.get('/api/agents/status', async (req, res) => {
      try {
        const queueStats = await queueManager.getAllStats();

        // Get recent agent logs
        const recentLogs = await AgentLog.find()
          .sort({ timestamp: -1 })
          .limit(50);

        res.json({
          success: true,
          queues: queueStats,
          recentLogs
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Agent statistics
    this.app.get('/api/agents/:agentName/stats', async (req, res) => {
      try {
        const { agentName } = req.params;
        const { hours = 24 } = req.query;

        const stats = await AgentLog.getAgentStats(agentName, parseInt(hours));

        res.json({ success: true, data: stats });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // System metrics
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const [
          totalNews,
          publishedNews,
          pendingApproval,
          breakingNews
        ] = await Promise.all([
          NewsItem.countDocuments(),
          NewsItem.countDocuments({ published: true }),
          NewsItem.countDocuments({ requiresApproval: true, approvalStatus: 'pending' }),
          NewsItem.countDocuments({ breaking: true, published: true })
        ]);

        const queueStats = await queueManager.getAllStats();

        res.json({
          success: true,
          metrics: {
            news: {
              total: totalNews,
              published: publishedNews,
              pendingApproval,
              breaking: breakingNews
            },
            queues: queueStats
          }
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // User profile
    this.app.get('/api/user/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const user = await UserProfile.findOne({ userId });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, data: user });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update user preferences
    this.app.put('/api/user/:userId/preferences', async (req, res) => {
      try {
        const { userId } = req.params;
        const updates = req.body;

        const user = await UserProfile.findOneAndUpdate(
          { userId },
          { $set: updates },
          { new: true, upsert: true }
        );

        res.json({ success: true, data: user });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      logger.error('[API] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Start server
   */
  async start() {
    try {
      // Connect to database
      await database.connect();

      // Initialize queues
      queueManager.initializeQueues();

      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`[API] Server running on port ${this.port}`);
        logger.info(`[API] Health check: http://localhost:${this.port}/health`);
      });

      return this.server;

    } catch (error) {
      logger.error('[API] Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });

      await queueManager.closeAll();
      await database.disconnect();

      logger.info('[API] Server stopped');
    }
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  const server = new APIServer(port);

  server.start().catch((error) => {
    logger.error('[API] Startup failed:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

export default APIServer;
export { APIServer };
