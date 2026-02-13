import { BaseAgent } from '../BaseAgent.js';
import Task from '../../models/Task.js';
import { AnthropicServiceProvider } from '../../services/AnthropicServiceProvider.js';

/**
 * DeveloperAgent - Code implementation with iteration
 *
 * Responsibilities:
 * - Implement assigned tasks
 * - Generate code
 * - Handle code review feedback
 * - Iterate based on testing results
 */

export class DeveloperAgent extends BaseAgent {
  constructor(name, config = {}, domainConfig = null) {
    super(name || 'developer', config, domainConfig);

    this.aiProvider = new AnthropicServiceProvider(config.anthropic || {});

    // Register skills
    this.registerSkill('implementTask', this.implementTask);
    this.registerSkill('generateCode', this.generateCode);
    this.registerSkill('refactor', this.refactorCode);
    this.registerSkill('fixBugs', this.fixBugs);
    this.registerSkill('handleFeedback', this.handleFeedback);

    this.logger.info(`${name} initialized`);
  }

  async execute(task) {
    try {
      const { mode, data } = task;

      switch (mode) {
        case 'implement':
          return await this.implementFullTask(data.taskId);
        case 'iterate':
          return await this.iterateOnFeedback(data.taskId, data.feedback);
        case 'fix-bug':
          return await this.fixTaskBugs(data.taskId, data.bugReport);
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('DeveloperAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Implement task
   */
  async implementTask(input) {
    const { task } = input;

    const prompt = `You are a developer implementing a task.

**Task:** ${task.title}
**Description:** ${task.description}

**Technical Details:**
Files: ${task.technical.files.join(', ')}
Dependencies: ${task.technical.dependencies.join(', ')}

**Acceptance Criteria:**
${task.implementation.approach || 'Not specified'}

Generate production-ready code:
1. Follow best practices
2. Add error handling
3. Include comments for complex logic
4. Use consistent formatting

Output as JSON:
{
  "code": "// full code here",
  "language": "javascript",
  "filePath": "src/routes/user.routes.js",
  "linesAdded": 50,
  "complexity": "medium",
  "notes": "Implemented with validation and error handling"
}`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 4000 });
    const result = JSON.parse(response);

    // Update task with generated code
    task.code = {
      language: result.language,
      filePath: result.filePath,
      content: result.code,
      linesAdded: result.linesAdded,
      complexity: result.complexity
    };
    task.status = 'code-review';
    task.addIteration(['Initial implementation'], 'Generated code');
    task.completeIteration('success', result.code, result.notes);

    await task.save();

    return {
      success: true,
      code: result.code,
      task: task.toObject()
    };
  }

  /**
   * Generate code
   */
  async generateCode(input) {
    const { taskDescription, files, language } = input;

    const prompt = `Generate ${language} code for: ${taskDescription}

Files to modify/create: ${files.join(', ')}

Output clean, production-ready code.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 3000 });
    return { success: true, code: response };
  }

  /**
   * Refactor code
   */
  async refactorCode(input) {
    const { code, reason } = input;

    const prompt = `Refactor this code:

\`\`\`
${code}
\`\`\`

**Reason:** ${reason}

Improve:
1. Readability
2. Performance
3. Maintainability

Output refactored code.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 3000 });
    return { success: true, refactoredCode: response };
  }

  /**
   * Fix bugs
   */
  async fixBugs(input) {
    const { code, bugReport } = input;

    const prompt = `Fix bug in this code:

\`\`\`
${code}
\`\`\`

**Bug Report:**
${bugReport}

Provide:
1. Root cause analysis
2. Fixed code
3. Test to prevent regression`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 3000 });
    return { success: true, fix: response };
  }

  /**
   * Handle feedback
   */
  async handleFeedback(input) {
    const { task, feedback } = input;

    const prompt = `Address code review feedback:

**Original Code:**
\`\`\`
${task.code.content}
\`\`\`

**Feedback:**
${feedback}

Provide updated code addressing all feedback.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 3000 });

    // Update task
    task.code.content = response;
    task.addIteration(['Addressed review feedback'], 'Code review iteration');
    task.completeIteration('success', response, 'Feedback addressed');

    return { success: true, updatedCode: response };
  }

  /**
   * Implement full task (workflow)
   */
  async implementFullTask(taskId) {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.startWork();
    await task.save();

    const result = await this.executeSkill('implementTask', { task });

    this.emit('task:implemented', {
      taskId: task.taskId,
      title: task.title,
      linesAdded: task.code.linesAdded
    });

    return result;
  }

  /**
   * Iterate on feedback
   */
  async iterateOnFeedback(taskId, feedback) {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const result = await this.executeSkill('handleFeedback', { task, feedback });

    task.status = 'code-review';
    await task.save();

    this.emit('task:iterated', {
      taskId: task.taskId,
      iterationNumber: task.iterations.length
    });

    return result;
  }

  /**
   * Fix task bugs
   */
  async fixTaskBugs(taskId, bugReport) {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const result = await this.executeSkill('fixBugs', {
      code: task.code.content,
      bugReport
    });

    task.code.content = result.fix;
    task.addIteration(['Bug fix'], bugReport);
    task.completeIteration('success', result.fix, 'Bug fixed');
    task.status = 'testing';
    await task.save();

    return result;
  }
}

export default DeveloperAgent;
