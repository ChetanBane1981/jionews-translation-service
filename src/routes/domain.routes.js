import express from 'express';
import domainManager from '../managers/DomainManager.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Domain Configuration API
 * Manage and query domain configurations
 */

/**
 * GET /api/domains
 * List all configured domains
 */
router.get('/', async (req, res) => {
  try {
    const domains = domainManager.getAllDomains();

    const domainList = domains.map(d => ({
      domainId: d.domainId,
      name: d.name,
      description: d.description,
      contentType: d.contentType,
      enabled: d.enabled,
      categories: d.categories?.length || 0,
      agents: d.agentPipeline?.length || 0,
      branding: d.branding
    }));

    res.json({
      success: true,
      data: domainList,
      count: domainList.length
    });

  } catch (error) {
    logger.error('[DomainRoutes] List failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/stats
 * Get domain statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = domainManager.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('[DomainRoutes] Stats failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/config
 * Get full configuration for a domain
 */
router.get('/:domainId/config', async (req, res) => {
  try {
    const { domainId } = req.params;

    const config = domainManager.getDomainConfig(domainId);

    if (!config) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get config failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/pipeline
 * Get agent pipeline for a domain
 */
router.get('/:domainId/pipeline', async (req, res) => {
  try {
    const { domainId } = req.params;

    const pipeline = domainManager.getDomainAgentPipeline(domainId);

    if (!pipeline) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: pipeline,
      count: pipeline.length
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get pipeline failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/categories
 * Get categories for a domain
 */
router.get('/:domainId/categories', async (req, res) => {
  try {
    const { domainId } = req.params;

    const categories = domainManager.getDomainCategories(domainId);

    if (!categories) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get categories failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/segments
 * Get user segments for a domain
 */
router.get('/:domainId/segments', async (req, res) => {
  try {
    const { domainId } = req.params;

    const segments = domainManager.getDomainUserSegments(domainId);

    if (!segments) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: segments,
      count: segments.length
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get segments failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/thresholds
 * Get processing thresholds for a domain
 */
router.get('/:domainId/thresholds', async (req, res) => {
  try {
    const { domainId } = req.params;

    const thresholds = domainManager.getDomainThresholds(domainId);

    if (!thresholds) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: thresholds
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get thresholds failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/branding
 * Get branding information for a domain
 */
router.get('/:domainId/branding', async (req, res) => {
  try {
    const { domainId } = req.params;

    const branding = domainManager.getDomainBranding(domainId);

    if (!branding) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      data: branding
    });

  } catch (error) {
    logger.error('[DomainRoutes] Get branding failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * POST /api/domains/:domainId/reload
 * Reload domain configuration from file
 */
router.post('/:domainId/reload', async (req, res) => {
  try {
    const { domainId } = req.params;

    const success = await domainManager.reloadDomain(domainId);

    if (!success) {
      return res.status(500).json({
        error: {
          code: 'RELOAD_FAILED',
          message: `Failed to reload domain '${domainId}'`
        }
      });
    }

    res.json({
      success: true,
      message: `Domain '${domainId}' reloaded successfully`
    });

  } catch (error) {
    logger.error('[DomainRoutes] Reload failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * PATCH /api/domains/:domainId/enable
 * Enable/disable a domain
 */
router.patch('/:domainId/enable', async (req, res) => {
  try {
    const { domainId } = req.params;
    const { enabled = true } = req.body;

    const success = domainManager.setDomainEnabled(domainId, enabled);

    if (!success) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.json({
      success: true,
      message: `Domain '${domainId}' ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    logger.error('[DomainRoutes] Enable/disable failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/domains/:domainId/export
 * Export domain configuration as JSON
 */
router.get('/:domainId/export', async (req, res) => {
  try {
    const { domainId } = req.params;

    const configJSON = domainManager.exportDomainConfig(domainId);

    if (!configJSON) {
      return res.status(404).json({
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: `Domain '${domainId}' not found`
        }
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${domainId}.domain.json"`);
    res.send(configJSON);

  } catch (error) {
    logger.error('[DomainRoutes] Export failed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
