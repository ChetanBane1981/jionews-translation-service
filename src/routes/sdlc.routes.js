import express from 'express';
import { SDLCOrchestrator } from '../orchestrator/SDLCOrchestrator.js';
import UserStory from '../models/UserStory.js';
import Task from '../models/Task.js';
import TestCase from '../models/TestCase.js';
import ApprovalGate from '../models/ApprovalGate.js';

const router = express.Router();

// Initialize SDLC orchestrator
const orchestrator = new SDLCOrchestrator();

/**
 * @route POST /api/sdlc/story/create
 * @desc Create a new user story from requirements
 */
router.post('/story/create', async (req, res) => {
  try {
    const result = await orchestrator.startFromRequirements(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: { code: 'CREATE_STORY_FAILED', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/story/:storyId
 * @desc Get story details
 */
router.get('/story/:storyId', async (req, res) => {
  try {
    const story = await UserStory.findOne({ storyId: req.params.storyId });
    if (!story) {
      return res.status(404).json({ error: { code: 'STORY_NOT_FOUND', message: 'Story not found' } });
    }
    res.json({ success: true, data: story });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/story/:storyId/status
 * @desc Get workflow status for a story
 */
router.get('/story/:storyId/status', async (req, res) => {
  try {
    const result = await orchestrator.getWorkflowStatus(req.params.storyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { code: 'STATUS_ERROR', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/story/:storyId/tasks
 * @desc Get all tasks for a story
 */
router.get('/story/:storyId/tasks', async (req, res) => {
  try {
    const story = await UserStory.findOne({ storyId: req.params.storyId });
    if (!story) {
      return res.status(404).json({ error: { code: 'STORY_NOT_FOUND', message: 'Story not found' } });
    }

    const tasks = await Task.findByStory(story._id);
    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @route POST /api/sdlc/gate/:gateId/approve
 * @desc Approve an approval gate
 */
router.post('/gate/:gateId/approve', async (req, res) => {
  try {
    const { userId, comments, checkedItems } = req.body;

    const result = await orchestrator.humanGateAgent.execute({
      mode: 'process-approval',
      data: {
        gateId: req.params.gateId,
        userId,
        decision: 'approved',
        comments,
        checkedItems
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { code: 'APPROVAL_FAILED', message: error.message } });
  }
});

/**
 * @route POST /api/sdlc/gate/:gateId/reject
 * @desc Reject an approval gate
 */
router.post('/gate/:gateId/reject', async (req, res) => {
  try {
    const { userId, comments, checkedItems } = req.body;

    const result = await orchestrator.humanGateAgent.execute({
      mode: 'process-approval',
      data: {
        gateId: req.params.gateId,
        userId,
        decision: 'rejected',
        comments,
        checkedItems
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { code: 'REJECTION_FAILED', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/gates/pending
 * @desc Get all pending approval gates
 */
router.get('/gates/pending', async (req, res) => {
  try {
    const gates = await ApprovalGate.findPendingGates();
    res.json({ success: true, data: gates, count: gates.length });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/tasks/:taskId
 * @desc Get task details
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/test-cases/:storyId
 * @desc Get all test cases for a story
 */
router.get('/test-cases/:storyId', async (req, res) => {
  try {
    const story = await UserStory.findOne({ storyId: req.params.storyId });
    if (!story) {
      return res.status(404).json({ error: { code: 'STORY_NOT_FOUND', message: 'Story not found' } });
    }

    const testCases = await TestCase.findByStory(story._id);
    res.json({ success: true, data: testCases, count: testCases.length });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @route GET /api/sdlc/dashboard
 * @desc Get SDLC dashboard summary
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stories = await UserStory.find({}).sort({ createdAt: -1 }).limit(10);
    const pendingGates = await ApprovalGate.findPendingGates();
    const tasks = await Task.find({ status: 'in-progress' }).limit(10);

    res.json({
      success: true,
      data: {
        recentStories: stories.map(s => ({
          storyId: s.storyId,
          title: s.title,
          status: s.status,
          priority: s.priority,
          createdAt: s.createdAt
        })),
        pendingApprovals: pendingGates.map(g => ({
          gateId: g.gateId,
          type: g.type,
          entityTitle: g.entity.entityTitle,
          dueDate: g.sla.dueDate
        })),
        activeTasks: tasks.map(t => ({
          taskId: t.taskId,
          title: t.title,
          assignedTo: t.assignedTo.agent,
          progress: t.progress.percentage
        })),
        metrics: {
          totalStories: await UserStory.countDocuments(),
          completedStories: await UserStory.countDocuments({ status: 'done' }),
          pendingApprovals: pendingGates.length,
          activeTasks: tasks.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'DASHBOARD_ERROR', message: error.message } });
  }
});

export default router;
