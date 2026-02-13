import { BaseAgent } from '../BaseAgent.js';
import UserStory from '../../models/UserStory.js';
import Task from '../../models/Task.js';
import TestCase from '../../models/TestCase.js';
import { AnthropicServiceProvider } from '../../services/AnthropicServiceProvider.js';

/**
 * MasterAgent - Task decomposition and sub-agent orchestration
 *
 * Responsibilities:
 * - Decompose user stories into tasks
 * - Generate use cases and test cases
 * - Define constitution (rules/constraints)
 * - Assign tasks to sub-agents
 * - Monitor task progress
 */

export class MasterAgent extends BaseAgent {
  constructor(config = {}, domainConfig = null) {
    super('master', config, domainConfig);

    this.aiProvider = new AnthropicServiceProvider(config.anthropic || {});

    // Sub-agent pool
    this.subAgents = ['developer-agent-1', 'developer-agent-2', 'developer-agent-3'];
    this.agentWorkload = new Map();
    this.subAgents.forEach(agent => this.agentWorkload.set(agent, 0));

    // Register skills
    this.registerSkill('decomposeStory', this.decomposeStory);
    this.registerSkill('generateUseCases', this.generateUseCases);
    this.registerSkill('generateTestCases', this.generateTestCases);
    this.registerSkill('defineConstitution', this.defineConstitution);
    this.registerSkill('assignTask', this.assignTask);
    this.registerSkill('balanceWorkload', this.balanceWorkload);

    this.logger.info('MasterAgent initialized');
  }

  async execute(task) {
    try {
      const { mode, data } = task;

      switch (mode) {
        case 'decompose-story':
          return await this.decomposeAndAssign(data.storyId);
        case 'assign-task':
          return await this.assignTaskToSubAgent(data.taskId);
        case 'monitor-progress':
          return await this.monitorAllTasks(data.storyId);
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('MasterAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Decompose story into tasks
   */
  async decomposeStory(input) {
    const { story } = input;

    const prompt = `You are a Master Agent decomposing a user story into development tasks.

**Story:** ${story.title}
**Description:** ${story.description}

**Acceptance Criteria:**
${JSON.stringify(story.acceptanceCriteria, null, 2)}

Decompose into granular tasks:
1. Frontend tasks (UI components, pages)
2. Backend tasks (API endpoints, business logic)
3. Database tasks (schema, migrations)
4. Testing tasks (unit, integration)
5. Documentation tasks

Each task should:
- Be completable in 2-8 hours
- Have clear deliverable
- Specify files to modify/create

Output as JSON:
{
  "tasks": [
    {
      "title": "Create user registration API endpoint",
      "description": "Implement POST /api/users endpoint with validation",
      "type": "backend",
      "estimatedHours": 4,
      "files": ["src/routes/user.routes.js", "src/controllers/userController.js"],
      "dependencies": [],
      "acceptanceCriteria": ["Endpoint accepts valid user data", "Returns 201 with user object"]
    }
  ],
  "useCases": ["User registration flow", "User login flow"],
  "constitution": {
    "rules": ["All API calls must validate input", "Use JWT for authentication"],
    "constraints": ["Max response time: 200ms"],
    "codeStandards": ["ESLint rules", "Prettier formatting"]
  }
}`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 3000 });
    const result = JSON.parse(response);

    // Create Task documents
    const createdTasks = [];
    for (const taskData of result.tasks) {
      const task = new Task({
        taskId: `TASK-${story.storyId}-${Date.now()}-${createdTasks.length}`,
        title: taskData.title,
        description: taskData.description,
        storyId: story._id,
        storyTitle: story.title,
        type: taskData.type,
        technical: {
          files: taskData.files || [],
          dependencies: taskData.dependencies || []
        },
        implementation: {
          approach: taskData.approach
        },
        assignedTo: {
          agent: this.selectBestAgent(taskData.type),
          priority: story.priority
        },
        effort: {
          estimatedHours: taskData.estimatedHours || 4
        },
        metadata: {
          createdBy: 'master-agent',
          complexity: taskData.complexity || 'medium'
        }
      });

      await task.save();
      createdTasks.push(task);

      // Update agent workload
      const agent = task.assignedTo.agent;
      this.agentWorkload.set(agent, this.agentWorkload.get(agent) + 1);
    }

    return {
      success: true,
      tasks: createdTasks,
      useCases: result.useCases,
      constitution: result.constitution
    };
  }

  /**
   * Generate use cases
   */
  async generateUseCases(input) {
    const { story } = input;

    const prompt = `Generate use cases for: ${story.title}

Include:
1. Primary flow (happy path)
2. Alternative flows
3. Exception flows

Output as JSON array of use cases.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 1500 });
    return { success: true, useCases: JSON.parse(response) };
  }

  /**
   * Generate test cases
   */
  async generateTestCases(input) {
    const { story, tasks } = input;

    const prompt = `Generate test cases for story: ${story.title}

**Acceptance Criteria:**
${JSON.stringify(story.acceptanceCriteria, null, 2)}

**Tasks:**
${tasks.map(t => t.title).join('\n')}

Generate:
1. Unit tests (per task)
2. Integration tests (API endpoints)
3. E2E tests (user flows)

Output as JSON:
{
  "testCases": [
    {
      "title": "Test user registration with valid data",
      "type": "integration",
      "steps": ["Send POST to /api/users", "Verify 201 response"],
      "testData": {"email": "test@example.com"},
      "expectedOutput": {"status": 201}
    }
  ]
}`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 2500 });
    const result = JSON.parse(response);

    // Create TestCase documents
    const createdTestCases = [];
    for (const tcData of result.testCases) {
      const testCase = new TestCase({
        testCaseId: `TC-${story.storyId}-${Date.now()}-${createdTestCases.length}`,
        title: tcData.title,
        description: tcData.description || tcData.title,
        storyId: story._id,
        type: tcData.type,
        priority: story.priority,
        steps: tcData.steps.map((step, i) => ({
          stepNumber: i + 1,
          action: step,
          expectedResult: tcData.expectedOutput
        })),
        testData: {
          input: tcData.testData,
          expectedOutput: tcData.expectedOutput
        },
        automation: {
          automated: false,
          framework: 'jest'
        },
        metadata: {
          createdBy: 'master-agent'
        }
      });

      await testCase.save();
      createdTestCases.push(testCase);
    }

    return {
      success: true,
      testCases: createdTestCases
    };
  }

  /**
   * Define constitution (rules and constraints)
   */
  async defineConstitution(input) {
    const { story } = input;

    const prompt = `Define project constitution for: ${story.title}

Include:
1. **Rules**: Must-follow rules (security, validation)
2. **Constraints**: Technical limits (response time, resource usage)
3. **Guidelines**: Best practices
4. **Code Standards**: Formatting, naming conventions

Output as JSON.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 1500 });
    return { success: true, constitution: JSON.parse(response) };
  }

  /**
   * Assign task to sub-agent
   */
  async assignTask(input) {
    const { task, preferredAgent } = input;

    const agent = preferredAgent || this.selectBestAgent(task.type);

    task.assignToAgent(agent, task.assignedTo.priority);
    await task.save();

    this.logger.info('Task assigned', { taskId: task.taskId, agent });

    this.emit('task:assigned', {
      taskId: task.taskId,
      agent,
      taskTitle: task.title
    });

    return {
      success: true,
      assignedTo: agent
    };
  }

  /**
   * Balance workload across agents
   */
  async balanceWorkload() {
    // Rebalance tasks if any agent is overloaded
    const avgWorkload = Array.from(this.agentWorkload.values()).reduce((a, b) => a + b, 0) / this.subAgents.length;

    for (const [agent, workload] of this.agentWorkload.entries()) {
      if (workload > avgWorkload * 1.5) {
        // Agent overloaded - reassign some tasks
        const tasks = await Task.find({
          'assignedTo.agent': agent,
          status: 'pending'
        }).limit(Math.floor(workload - avgWorkload));

        for (const task of tasks) {
          const newAgent = this.selectLeastLoadedAgent();
          task.assignToAgent(newAgent, task.assignedTo.priority);
          await task.save();

          this.agentWorkload.set(agent, this.agentWorkload.get(agent) - 1);
          this.agentWorkload.set(newAgent, this.agentWorkload.get(newAgent) + 1);

          this.logger.info('Task reassigned', { taskId: task.taskId, from: agent, to: newAgent });
        }
      }
    }

    return { success: true, workload: Object.fromEntries(this.agentWorkload) };
  }

  /**
   * Decompose and assign (full workflow)
   */
  async decomposeAndAssign(storyId) {
    const story = await UserStory.findOne({ storyId });
    if (!story) throw new Error(`Story ${storyId} not found`);

    // Step 1: Decompose story
    const decomposed = await this.executeSkill('decomposeStory', { story });

    // Step 2: Generate test cases
    const testCases = await this.executeSkill('generateTestCases', {
      story,
      tasks: decomposed.tasks
    });

    // Step 3: Update story with tasks and constitution
    story.tasks = decomposed.tasks.map(t => ({
      taskId: t._id,
      title: t.title,
      status: t.status,
      assignedTo: t.assignedTo.agent
    }));
    story.testCases = testCases.testCases.map(tc => ({
      testCaseId: tc._id,
      title: tc.title,
      status: tc.status
    }));
    story.constitution = decomposed.constitution;
    story.status = 'in-progress';
    await story.save();

    this.logger.info('Story decomposed', {
      storyId,
      taskCount: decomposed.tasks.length,
      testCaseCount: testCases.testCases.length
    });

    this.emit('story:decomposed', {
      storyId: story.storyId,
      taskCount: decomposed.tasks.length,
      testCaseCount: testCases.testCases.length
    });

    return {
      success: true,
      story: story.toObject(),
      tasks: decomposed.tasks,
      testCases: testCases.testCases,
      constitution: decomposed.constitution
    };
  }

  /**
   * Assign task to sub-agent
   */
  async assignTaskToSubAgent(taskId) {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error(`Task ${taskId} not found`);

    return await this.executeSkill('assignTask', { task });
  }

  /**
   * Monitor all tasks for a story
   */
  async monitorAllTasks(storyId) {
    const tasks = await Task.findByStory(storyId);

    const summary = {
      total: tasks.length,
      byStatus: {},
      blocked: []
    };

    for (const task of tasks) {
      summary.byStatus[task.status] = (summary.byStatus[task.status] || 0) + 1;

      if (task.status === 'blocked') {
        summary.blocked.push({
          taskId: task.taskId,
          title: task.title,
          blockers: task.blockers.filter(b => !b.resolved)
        });
      }
    }

    return { success: true, summary };
  }

  /**
   * Helper: Select best agent for task type
   */
  selectBestAgent(taskType) {
    // Simple round-robin for now
    // In production, consider agent skills, workload, availability
    return this.selectLeastLoadedAgent();
  }

  /**
   * Helper: Select least loaded agent
   */
  selectLeastLoadedAgent() {
    let minWorkload = Infinity;
    let selectedAgent = this.subAgents[0];

    for (const [agent, workload] of this.agentWorkload.entries()) {
      if (workload < minWorkload) {
        minWorkload = workload;
        selectedAgent = agent;
      }
    }

    return selectedAgent;
  }
}

export default MasterAgent;
