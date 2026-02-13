import EventEmitter from 'events';
import ProductManagerAgent from '../agents/sdlc/ProductManagerAgent.js';
import ProjectManagerAgent from '../agents/sdlc/ProjectManagerAgent.js';
import MasterAgent from '../agents/sdlc/MasterAgent.js';
import DeveloperAgent from '../agents/sdlc/DeveloperAgent.js';
import TestingAgent from '../agents/sdlc/TestingAgent.js';
import HumanGateAgent from '../agents/sdlc/HumanGateAgent.js';
import UserStory from '../models/UserStory.js';
import Task from '../models/Task.js';
import ApprovalGate from '../models/ApprovalGate.js';

/**
 * SDLCOrchestrator - Coordinates the complete software development lifecycle
 *
 * Workflow:
 * 1. PM gathers requirements → creates story
 * 2. Human reviews story → PM approval gate
 * 3. Master agent decomposes → creates tasks + test cases
 * 4. Developer agents implement tasks
 * 5. Testing agent validates results
 * 6. Iteration if tests fail
 * 7. Final walkthrough (human gate)
 * 8. Production approval (human gate)
 */

export class SDLCOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;

    // Initialize agents
    this.pmAgent = new ProductManagerAgent(config);
    this.projectAgent = new ProjectManagerAgent(config);
    this.masterAgent = new MasterAgent(config);
    this.testingAgent = new TestingAgent(config);
    this.humanGateAgent = new HumanGateAgent(config);

    // Developer agent pool
    this.developerAgents = [
      new DeveloperAgent('developer-agent-1', config),
      new DeveloperAgent('developer-agent-2', config),
      new DeveloperAgent('developer-agent-3', config)
    ];

    // Listen to agent events
    this.setupEventListeners();

    this.logger = {
      info: (msg, data) => console.log(`[SDLCOrchestrator] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[SDLCOrchestrator] ERROR: ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[SDLCOrchestrator] WARN: ${msg}`, data || '')
    };

    this.logger.info('SDLCOrchestrator initialized');
  }

  /**
   * Setup event listeners between agents
   */
  setupEventListeners() {
    // PM events → Project Manager
    this.pmAgent.on('story:created', async (data) => {
      this.logger.info('Story created, initiating PM review', data);
      await this.initiateStoryReview(data.storyId);
    });

    // Project Manager events → Master Agent
    this.projectAgent.on('story:approved', async (data) => {
      this.logger.info('Story approved, decomposing into tasks', data);
      await this.decomposeStory(data.storyId);
    });

    // Master Agent events → Developer Agents
    this.masterAgent.on('story:decomposed', async (data) => {
      this.logger.info('Story decomposed, assigning tasks to developers', data);
      await this.assignTasksToDevelopers(data.storyId);
    });

    // Master Agent task assignment → Developer execution
    this.masterAgent.on('task:assigned', async (data) => {
      this.logger.info('Task assigned, starting implementation', data);
      await this.executeDeveloperTask(data.taskId, data.agent);
    });

    // Developer events → Testing Agent
    this.developerAgents.forEach(agent => {
      agent.on('task:implemented', async (data) => {
        this.logger.info('Task implemented, running tests', data);
        await this.runTests(data.taskId);
      });
    });

    // Testing Agent events → Iteration or Completion
    this.testingAgent.on('task:tests-passed', async (data) => {
      this.logger.info('Tests passed, task complete', data);
      await this.checkStoryCompletion(data.taskId);
    });

    this.testingAgent.on('task:tests-failed', async (data) => {
      this.logger.info('Tests failed, initiating iteration', data);
      await this.initiateIteration(data.taskId);
    });

    // Human Gate events → Update workflow
    this.humanGateAgent.on('gate:approved', async (data) => {
      this.logger.info('Gate approved, continuing workflow', data);
      await this.continueAfterGateApproval(data);
    });

    this.humanGateAgent.on('gate:rejected', async (data) => {
      this.logger.info('Gate rejected, halting workflow', data);
      await this.handleGateRejection(data);
    });
  }

  /**
   * Start SDLC workflow from requirements
   */
  async startFromRequirements(requirements) {
    try {
      this.logger.info('Starting SDLC workflow', { requirements: requirements.title });

      // Step 1: PM creates story
      const result = await this.pmAgent.execute({
        mode: 'create-story',
        requirements
      });

      return {
        success: true,
        storyId: result.story.storyId,
        status: result.story.status,
        message: 'SDLC workflow initiated'
      };

    } catch (error) {
      this.logger.error('Failed to start SDLC workflow', { error: error.message });
      throw error;
    }
  }

  /**
   * Initiate story review (PM approval gate)
   */
  async initiateStoryReview(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) throw new Error(`Story ${storyId} not found`);

      // Create human gate for PM review
      await this.humanGateAgent.execute({
        mode: 'create-gate',
        data: {
          entityType: 'user-story',
          entityId: storyId,
          gateType: 'story-review',
          approvers: [
            {
              role: 'product-manager',
              userId: 'pm-001',
              name: 'Product Manager',
              email: 'pm@example.com',
              required: true
            }
          ],
          checklist: [
            'Requirements are clear',
            'Acceptance criteria are testable',
            'Research is complete'
          ]
        }
      });

      // AI-powered review
      const reviewResult = await this.pmAgent.execute({
        mode: 'review',
        requirements: { storyId }
      });

      // If AI approves with high confidence, auto-approve gate
      if (reviewResult.decision === 'approved') {
        await this.projectAgent.execute({
          mode: 'review-story',
          data: { storyId }
        });
      }

    } catch (error) {
      this.logger.error('Story review failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Decompose story into tasks
   */
  async decomposeStory(storyId) {
    try {
      await this.masterAgent.execute({
        mode: 'decompose-story',
        data: { storyId }
      });

    } catch (error) {
      this.logger.error('Story decomposition failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assign tasks to developer agents
   */
  async assignTasksToDevelopers(storyId) {
    try {
      const tasks = await Task.findByStory(storyId);

      for (const task of tasks) {
        // Already assigned by Master Agent
        this.emit('task:assigned', {
          taskId: task.taskId,
          agent: task.assignedTo.agent
        });
      }

    } catch (error) {
      this.logger.error('Task assignment failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute developer task
   */
  async executeDeveloperTask(taskId, agentName) {
    try {
      const agent = this.developerAgents.find(a => a.name === agentName);
      if (!agent) {
        this.logger.warn('Agent not found, using default', { agentName });
        agent = this.developerAgents[0];
      }

      await agent.execute({
        mode: 'implement',
        data: { taskId }
      });

    } catch (error) {
      this.logger.error('Task execution failed', { taskId, error: error.message });
      throw error;
    }
  }

  /**
   * Run tests for task
   */
  async runTests(taskId) {
    try {
      await this.testingAgent.execute({
        mode: 'run-tests',
        data: { taskId }
      });

    } catch (error) {
      this.logger.error('Test execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initiate iteration (tests failed)
   */
  async initiateIteration(taskId) {
    try {
      const task = await Task.findOne({ taskId });
      if (!task) throw new Error(`Task ${taskId} not found`);

      // Get test failure analysis
      const testCases = await TestCase.find({ taskId: task._id, status: 'failed' });

      let feedback = 'Tests failed: ';
      for (const tc of testCases) {
        const lastExecution = tc.executions[tc.executions.length - 1];
        feedback += `${tc.title}: ${lastExecution.errorMessage}. `;
      }

      // Send to developer for iteration
      const agent = this.developerAgents.find(a => a.name === task.assignedTo.agent);
      if (agent) {
        await agent.execute({
          mode: 'iterate',
          data: {
            taskId,
            feedback
          }
        });

        // Re-run tests after iteration
        await this.runTests(taskId);
      }

    } catch (error) {
      this.logger.error('Iteration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if all tasks in story are complete
   */
  async checkStoryCompletion(taskId) {
    try {
      const task = await Task.findOne({ taskId });
      if (!task) return;

      const allTasks = await Task.findByStory(task.storyId);
      const completedTasks = allTasks.filter(t => t.status === 'completed');

      if (completedTasks.length === allTasks.length) {
        // All tasks complete → Final walkthrough
        this.logger.info('All tasks complete, initiating final walkthrough');

        const story = await UserStory.findById(task.storyId);
        if (story) {
          // Create final walkthrough gate
          await this.humanGateAgent.execute({
            mode: 'create-gate',
            data: {
              entityType: 'user-story',
              entityId: story.storyId,
              gateType: 'final-walkthrough',
              approvers: [
                {
                  role: 'product-manager',
                  userId: 'pm-001',
                  name: 'Product Manager',
                  required: true
                },
                {
                  role: 'project-manager',
                  userId: 'pjm-001',
                  name: 'Project Manager',
                  required: true
                }
              ],
              checklist: [
                'All acceptance criteria met',
                'Demo successful',
                'Documentation complete',
                'Ready for production'
              ]
            }
          });

          this.emit('story:ready-for-walkthrough', {
            storyId: story.storyId,
            title: story.title
          });
        }
      }

    } catch (error) {
      this.logger.error('Story completion check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Continue after gate approval
   */
  async continueAfterGateApproval(data) {
    try {
      const { entityType, entityId, gateId } = data;

      const gate = await ApprovalGate.findOne({ gateId });
      if (!gate) return;

      if (gate.type === 'final-walkthrough') {
        // Create production-ready gate
        await this.humanGateAgent.execute({
          mode: 'create-gate',
          data: {
            entityType,
            entityId,
            gateType: 'production-ready',
            approvers: [
              {
                role: 'project-manager',
                userId: 'pjm-001',
                name: 'Project Manager',
                required: true
              }
            ],
            checklist: [
              'Final approval granted',
              'Production deployment scheduled',
              'Rollback plan documented'
            ]
          }
        });
      } else if (gate.type === 'production-ready') {
        // Mark story as done
        if (entityType === 'user-story') {
          const story = await UserStory.findById(entityId);
          if (story) {
            story.status = 'done';
            story.completedAt = new Date();
            await story.save();

            this.emit('story:completed', {
              storyId: story.storyId,
              title: story.title,
              totalTime: story.completedAt - story.createdAt
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Post-approval processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle gate rejection
   */
  async handleGateRejection(data) {
    try {
      const { gateId, reason } = data;

      const gate = await ApprovalGate.findOne({ gateId });
      if (!gate) return;

      // Update entity status to rejected/revision-required
      this.emit('workflow:halted', {
        gateType: gate.type,
        reason
      });

    } catch (error) {
      this.logger.error('Gate rejection handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get workflow status for a story
   */
  async getWorkflowStatus(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) throw new Error(`Story ${storyId} not found`);

      const tasks = await Task.findByStory(story._id);
      const gates = await ApprovalGate.findByEntity('user-story', story._id);

      const status = {
        story: {
          storyId: story.storyId,
          title: story.title,
          status: story.status,
          progress: this.calculateProgress(tasks)
        },
        tasks: {
          total: tasks.length,
          byStatus: this.groupByStatus(tasks),
          completed: tasks.filter(t => t.status === 'completed').length
        },
        gates: {
          total: gates.length,
          pending: gates.filter(g => g.status === 'pending').length,
          approved: gates.filter(g => g.status === 'approved').length
        },
        timeline: {
          started: story.createdAt,
          estimated: story.estimatedEffort?.hours,
          actualHours: tasks.reduce((sum, t) => sum + (t.effort.actualHours || 0), 0)
        }
      };

      return {
        success: true,
        status
      };

    } catch (error) {
      this.logger.error('Failed to get workflow status', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Calculate progress percentage
   */
  calculateProgress(tasks) {
    if (tasks.length === 0) return 0;

    const totalProgress = tasks.reduce((sum, t) => sum + (t.progress?.percentage || 0), 0);
    return Math.round(totalProgress / tasks.length);
  }

  /**
   * Helper: Group tasks by status
   */
  groupByStatus(tasks) {
    const grouped = {};
    tasks.forEach(task => {
      grouped[task.status] = (grouped[task.status] || 0) + 1;
    });
    return grouped;
  }
}

export default SDLCOrchestrator;
