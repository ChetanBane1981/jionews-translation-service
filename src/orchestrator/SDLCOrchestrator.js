import EventEmitter from 'events';
import ProductManagerAgent from '../agents/sdlc/ProductManagerAgent.js';
import ProjectManagerAgent from '../agents/sdlc/ProjectManagerAgent.js';
import MasterAgent from '../agents/sdlc/MasterAgent.js';
import DeveloperAgent from '../agents/sdlc/DeveloperAgent.js';
import TestingAgent from '../agents/sdlc/TestingAgent.js';
import HumanGateAgent from '../agents/sdlc/HumanGateAgent.js';
import UserStory from '../models/UserStory.js';
import Task from '../models/Task.js';
import TestCase from '../models/TestCase.js';
import ApprovalGate from '../models/ApprovalGate.js';

/**
 * SDLCOrchestrator - Coordinates the complete software development lifecycle
 *
 * ENHANCED WORKFLOW WITH TEAM TRANSITIONS:
 * 1. PM provides requirements → creates story
 * 2. Research Team researches → updates acceptance criteria
 * 3. [CHECKPOINT 1] Human approval → move to Development
 * 4. Dev Lead (Master) creates constitution, use cases, decomposes tasks
 * 5. Testing Lead creates test cases (ready state, waits for dev)
 * 6. Dev Sub-Agents work in PARALLEL on tasks (iteration or completion)
 * 7. [CHECKPOINT 2] Use cases validation → if pass, move to Testing
 * 8. Testing Agent runs all test cases
 *    - If FAIL → revert to Dev (iteration loop)
 *    - If PASS → generate test matrix
 * 9. [CHECKPOINT 3] PM reviews test matrix → final approval
 * 10. [CHECKPOINT 4] Production approval → DONE
 *
 * Human Interference: Only at checkpoints for approval to move between teams
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

  /**
   * ENHANCEMENT: Execute tasks in parallel (Dev sub-agents)
   */
  async executeTasksInParallel(storyId) {
    try {
      const tasks = await Task.find({ storyId, status: 'assigned' });

      if (tasks.length === 0) {
        this.logger.warn('No tasks to execute in parallel');
        return { success: true, message: 'No tasks ready' };
      }

      this.logger.info(`Executing ${tasks.length} tasks in parallel`);

      // Execute all tasks concurrently
      const promises = tasks.map(task => {
        const agent = this.developerAgents.find(a => a.name === task.assignedTo.agent);
        if (!agent) {
          this.logger.warn(`Agent ${task.assignedTo.agent} not found, using default`);
          return this.executeDeveloperTask(task.taskId, this.developerAgents[0].name);
        }
        return this.executeDeveloperTask(task.taskId, task.assignedTo.agent);
      });

      // Wait for all to complete
      const results = await Promise.allSettled(promises);

      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      };

      this.emit('tasks:parallel-execution-complete', {
        storyId,
        summary
      });

      return {
        success: true,
        summary,
        results
      };

    } catch (error) {
      this.logger.error('Parallel execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Validate use cases before moving to testing
   */
  async validateUseCases(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) throw new Error(`Story ${storyId} not found`);

      // Get all tasks
      const tasks = await Task.findByStory(story._id);
      const allComplete = tasks.every(t => t.status === 'completed');

      if (!allComplete) {
        return {
          success: false,
          message: 'Not all tasks complete',
          ready: false
        };
      }

      // Create use cases validation checkpoint (CHECKPOINT 2)
      await this.humanGateAgent.execute({
        mode: 'create-gate',
        data: {
          entityType: 'user-story',
          entityId: storyId,
          gateType: 'technical-review',
          approvers: [
            {
              role: 'tech-lead',
              userId: 'tech-001',
              name: 'Technical Lead',
              required: true
            }
          ],
          checklist: [
            'All use cases implemented correctly',
            'Code follows constitution rules',
            'No critical bugs in implementation',
            'Ready to move to testing phase'
          ]
        }
      });

      this.emit('use-cases:validation-required', {
        storyId: story.storyId,
        title: story.title,
        taskCount: tasks.length
      });

      return {
        success: true,
        message: 'Use cases validation checkpoint created',
        ready: false, // Waits for human approval
        gateType: 'technical-review'
      };

    } catch (error) {
      this.logger.error('Use cases validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Generate comprehensive test matrix for PM
   */
  async generateTestMatrix(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) throw new Error(`Story ${storyId} not found`);

      const testCases = await TestCase.findByStory(story._id);

      if (testCases.length === 0) {
        return {
          success: false,
          message: 'No test cases found'
        };
      }

      // Calculate comprehensive test matrix
      const matrix = {
        storyId: story.storyId,
        storyTitle: story.title,
        testSummary: {
          total: testCases.length,
          passed: testCases.filter(tc => tc.status === 'passed').length,
          failed: testCases.filter(tc => tc.status === 'failed').length,
          skipped: testCases.filter(tc => tc.status === 'skipped').length,
          passRate: 0
        },
        byType: {},
        detailedResults: [],
        overallDecision: 'pending'
      };

      // Calculate pass rate
      matrix.testSummary.passRate = matrix.testSummary.total > 0
        ? Math.round((matrix.testSummary.passed / matrix.testSummary.total) * 100)
        : 0;

      // Group by type
      testCases.forEach(tc => {
        if (!matrix.byType[tc.type]) {
          matrix.byType[tc.type] = {
            total: 0,
            passed: 0,
            failed: 0
          };
        }
        matrix.byType[tc.type].total++;
        if (tc.status === 'passed') matrix.byType[tc.type].passed++;
        if (tc.status === 'failed') matrix.byType[tc.type].failed++;
      });

      // Detailed results
      matrix.detailedResults = testCases.map(tc => ({
        testCaseId: tc.testCaseId,
        title: tc.title,
        type: tc.type,
        status: tc.status,
        executions: tc.executions.length,
        lastExecution: tc.lastExecuted,
        passRate: tc.passMatrix.passRate,
        consecutivePasses: tc.passMatrix.consecutivePasses,
        stability: tc.passMatrix.stability
      }));

      // Overall decision
      if (matrix.testSummary.passRate >= 95) {
        matrix.overallDecision = 'approved';
      } else if (matrix.testSummary.passRate >= 80) {
        matrix.overallDecision = 'conditional-approval';
        matrix.conditions = ['Some tests failed - review recommended'];
      } else {
        matrix.overallDecision = 'rejected';
        matrix.reason = `Pass rate ${matrix.testSummary.passRate}% below threshold (80%)`;
      }

      this.logger.info('Test matrix generated', {
        storyId,
        passRate: matrix.testSummary.passRate,
        decision: matrix.overallDecision
      });

      return {
        success: true,
        testMatrix: matrix
      };

    } catch (error) {
      this.logger.error('Test matrix generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Revert ticket from Testing back to Dev (clear feedback loop)
   */
  async revertToDevFromTesting(storyId, failedTests) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) throw new Error(`Story ${storyId} not found`);

      // Update story status
      story.status = 'in-progress';
      story.addIteration(['Tests failed - reverting to development'], 'Testing phase failed');
      await story.save();

      // Get all tasks and reset to revision status
      const tasks = await Task.findByStory(story._id);

      const feedbackByTask = this.categorizeFailuresByTask(failedTests, tasks);

      // Update tasks with specific feedback
      for (const task of tasks) {
        const feedback = feedbackByTask.get(task.taskId) || [];

        if (feedback.length > 0) {
          task.status = 'revision';
          task.addIteration(['Test failures detected'], `Failed tests: ${feedback.join(', ')}`);
          await task.save();

          // Emit event for developer to handle
          this.emit('task:revert-from-testing', {
            taskId: task.taskId,
            failures: feedback,
            assignedTo: task.assignedTo.agent
          });
        }
      }

      this.logger.info('Ticket reverted to Development', {
        storyId,
        affectedTasks: Array.from(feedbackByTask.keys()).length
      });

      this.emit('story:reverted-to-dev', {
        storyId: story.storyId,
        title: story.title,
        failureCount: failedTests.length,
        iterationNumber: story.iterations.length
      });

      return {
        success: true,
        message: 'Ticket reverted to Development',
        affectedTasks: Array.from(feedbackByTask.keys()).length,
        iterationNumber: story.iterations.length
      };

    } catch (error) {
      this.logger.error('Revert to dev failed', { error: error.message });
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Categorize test failures by task
   */
  categorizeFailuresByTask(failedTests, tasks) {
    const feedbackMap = new Map();

    failedTests.forEach(test => {
      // Find which task this test belongs to
      const relatedTask = tasks.find(t =>
        test.description && t.title &&
        (test.description.includes(t.title) || t.title.includes(test.title))
      );

      if (relatedTask) {
        if (!feedbackMap.has(relatedTask.taskId)) {
          feedbackMap.set(relatedTask.taskId, []);
        }
        feedbackMap.get(relatedTask.taskId).push(test.title);
      }
    });

    return feedbackMap;
  }

  /**
   * ENHANCEMENT: Create PM final approval gate with test matrix
   */
  async createPMFinalApproval(storyId, testMatrix) {
    try {
      await this.humanGateAgent.execute({
        mode: 'create-gate',
        data: {
          entityType: 'user-story',
          entityId: storyId,
          gateType: 'final-walkthrough',
          approvers: [
            {
              role: 'product-manager',
              userId: 'pm-001',
              name: 'Product Manager',
              required: true
            }
          ],
          checklist: [
            `All tests passed: ${testMatrix.testSummary.passed}/${testMatrix.testSummary.total}`,
            `Pass rate: ${testMatrix.testSummary.passRate}%`,
            'All acceptance criteria met',
            'Ready for production deployment'
          ]
        }
      });

      this.emit('pm-approval:required', {
        storyId,
        testMatrix
      });

      return {
        success: true,
        message: 'PM final approval gate created',
        testMatrix
      };

    } catch (error) {
      this.logger.error('PM approval gate creation failed', { error: error.message });
      throw error;
    }
  }
}

export default SDLCOrchestrator;
