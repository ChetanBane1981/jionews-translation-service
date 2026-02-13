import express from 'express';
import ContentItem from '../models/ContentItem.js';
import domainManager from '../managers/DomainManager.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Generic Content Routes
 * Works for ALL domains: news, products, social posts, etc.
 */

/**
 * GET /api/content
 * List content items for a domain
 */
router.get('/', async (req, res) => {
  try {
    const {
      domain = 'news',
      category,
      type,
      published,
      page = 1,
      limit = 20,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate domain exists
    const domainConfig = domainManager.getDomainConfig(domain);
    if (!domainConfig) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domain}' not found`
        }
      });
    }

    // Build query
    const query = { domain };
    if (category) query['domainMetadata.category'] = category;
    if (type) query.type = type;
    if (published !== undefined) query.published = published === 'true';

    // Pagination
    const skip = (page - 1) * parseInt(limit);

    // Execute query
    const [items, total] = await Promise.all([
      ContentItem.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ContentItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      domain: domainConfig.name
    });

  } catch (error) {
    logger.error('[ContentRoutes] List failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/content/:id
 * Get single content item
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const item = await ContentItem.findOne({ id });

    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Content item ${id} not found`
        }
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    logger.error('[ContentRoutes] Get failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/content/domain/:domain/trending
 * Get trending/high-importance content for a domain
 */
router.get('/domain/:domain/trending', async (req, res) => {
  try {
    const { domain } = req.params;
    const { limit = 10 } = req.query;

    // Validate domain
    const domainConfig = domainManager.getDomainConfig(domain);
    if (!domainConfig) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domain}' not found`
        }
      });
    }

    const items = await ContentItem.findHighImportance(domain, 80);

    res.json({
      success: true,
      data: items.slice(0, parseInt(limit)),
      domain: domainConfig.name
    });

  } catch (error) {
    logger.error('[ContentRoutes] Trending failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/content/domain/:domain/categories/:category
 * Get content by category for a domain
 */
router.get('/domain/:domain/categories/:category', async (req, res) => {
  try {
    const { domain, category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const domainConfig = domainManager.getDomainConfig(domain);
    if (!domainConfig) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domain}' not found`
        }
      });
    }

    const skip = (page - 1) * parseInt(limit);

    const items = await ContentItem.findByCategory(domain, category)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: items,
      domain: domainConfig.name,
      category
    });

  } catch (error) {
    logger.error('[ContentRoutes] Category list failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * POST /api/content/search
 * Search content across domains
 */
router.post('/search', async (req, res) => {
  try {
    const { query, domain, filters = {}, page = 1, limit = 20 } = req.body;

    const searchQuery = { $text: { $search: query } };
    if (domain) searchQuery.domain = domain;

    // Apply filters
    Object.keys(filters).forEach(key => {
      searchQuery[key] = filters[key];
    });

    const skip = (page - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      ContentItem.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit)),
      ContentItem.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('[ContentRoutes] Search failed:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/content/pending-approval
 * Get content pending human approval
 */
router.get('/pending-approval', async (req, res) => {
  try {
    const { domain } = req.query;

    const items = await ContentItem.findPendingApproval(domain);

    res.json({
      success: true,
      data: items,
      count: items.length
    });

  } catch (error) {
    logger.error('[ContentRoutes] Pending approval list failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * PATCH /api/content/:id/approve
 * Approve content item
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver = 'system' } = req.body;

    const item = await ContentItem.findOne({ id });
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Content item ${id} not found`
        }
      });
    }

    await item.approve(approver);

    res.json({
      success: true,
      data: item,
      message: 'Content approved'
    });

  } catch (error) {
    logger.error('[ContentRoutes] Approve failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * PATCH /api/content/:id/reject
 * Reject content item
 */
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver = 'system', reason } = req.body;

    const item = await ContentItem.findOne({ id });
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Content item ${id} not found`
        }
      });
    }

    await item.reject(approver, reason);

    res.json({
      success: true,
      data: item,
      message: 'Content rejected'
    });

  } catch (error) {
    logger.error('[ContentRoutes] Reject failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
