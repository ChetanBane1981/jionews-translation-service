import { BaseAgent } from '../BaseAgent.js';
import Task from '../../models/Task.js';
import TestCase from '../../models/TestCase.js';
import { AnthropicServiceProvider } from '../../services/AnthropicServiceProvider.js';

/**
 * TestingAgent - Test execution and validation
 *
 * Responsibilities:
 * - Execute test cases
 * - Validate against pass matrix
 * - Provide feedback for iteration
 * - Approve or reject based on results
 */

export class TestingAgent extends BaseAgent {
  constructor(config = {}, domainConfig = null) {
    super('testing', config, domainConfig);

    this.aiProvider = new AnthropicServiceProvider(config.anthropic || {});

    // Register skills
    this.registerSkill('executeTests', this.executeTests);
    this.registerSkill('validatePassMatrix', this.validatePassMatrix);
    this.registerSkill('generateTestCode', this.generateTestCode);
    this.registerSkill('analyzeFai lures', this.analyzeFailures);

    this.logger.info('TestingAgent initialized');
  }

  async execute(task) {
    try {
      const { mode, data } = task;

      switch (mode) {
        case 'run-tests':
          return await this.runTestSuite(data.taskId || data.storyId);
        case 'generate-tests':
          return await this.generateTestsForTask(data.taskId);
        case 'validate-results':
          return await this.validateTestResults(data.testCaseId);
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('TestingAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute tests
   */
  async executeTests(input) {
    const { testCase, code } = input;

    const prompt = `You are a testing agent executing a test case.

**Test Case:** ${testCase.title}
**Type:** ${testCase.type}

**Steps:**
${testCase.steps.map((s, i) => `${i + 1}. ${s.action} → Expected: ${s.expectedResult}`).join('\n')}

**Code Being Tested:**
\`\`\`
${code}
\`\`\`

**Test Data:**
Input: ${JSON.stringify(testCase.testData.input)}
Expected Output: ${JSON.stringify(testCase.testData.expectedOutput)}

Execute the test and provide results:

Output as JSON:
{
  "status": "passed" | "failed",
  "actualOutput": {},
  "errorMessage": "error if failed",
  "duration": 150,
  "steps": [
    {"stepNumber": 1, "status": "passed", "actualResult": "..."}
  ]
}`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 2000 });
    const result = JSON.parse(response);

    // Record execution
    testCase.addExecution(
      result.status,
      'testing-agent',
      result.duration,
      result.errorMessage
    );

    // Update test data
    testCase.testData.actualOutput = result.actualOutput;

    // Update steps
    testCase.steps.forEach((step, i) => {
      if (result.steps[i]) {
        step.status = result.steps[i].status;
        step.actualResult = result.steps[i].actualResult;
      }
    });

    await testCase.save();

    return {
      success: true,
      testResult: result,
      testCase: testCase.toObject()
    };
  }

  /**
   * Validate pass matrix
   */
  async validatePassMatrix(input) {
    const { testCase } = input;

    const passMatrix = testCase.passMatrix;
    const recentExecutions = testCase.executions.slice(-10);

    const passed = recentExecutions.filter(e => e.status === 'passed').length;
    const failed = recentExecutions.filter(e => e.status === 'failed').length;

    const passRate = recentExecutions.length > 0
      ? (passed / recentExecutions.length) * 100
      : 0;

    const decision = {
      approved: false,
      reason: ''
    };

    // Check consecutive passes
    if (passMatrix.consecutivePasses >= passMatrix.requiredPasses) {
      decision.approved = true;
      decision.reason = `Met requirement: ${passMatrix.requiredPasses} consecutive passes`;
    }
    // Check failure threshold
    else if (passMatrix.currentFailures >= passMatrix.failureThreshold) {
      decision.approved = false;
      decision.reason = `Exceeded failure threshold: ${passMatrix.currentFailures}/${passMatrix.failureThreshold}`;
      decision.needsIteration = true;
    }
    // Check pass rate
    else if (passRate < 70) {
      decision.approved = false;
      decision.reason = `Low pass rate: ${passRate.toFixed(1)}% (need >70%)`;
      decision.needsIteration = true;
    }

    return {
      success: true,
      decision,
      passRate,
      consecutivePasses: passMatrix.consecutivePasses,
      currentFailures: passMatrix.currentFailures
    };
  }

  /**
   * Generate test code
   */
  async generateTestCode(input) {
    const { testCase, framework } = input;

    const prompt = `Generate ${framework} test code for:

**Test Case:** ${testCase.title}
**Type:** ${testCase.type}

**Steps:**
${testCase.steps.map((s, i) => `${i + 1}. ${s.action}`).join('\n')}

**Test Data:**
${JSON.stringify(testCase.testData, null, 2)}

Generate executable test code.`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 2000 });

    testCase.automation.automated = true;
    testCase.automation.framework = framework;
    testCase.automation.testCode = response;
    testCase.status = 'ready';
    await testCase.save();

    return {
      success: true,
      testCode: response
    };
  }

  /**
   * Analyze failures
   */
  async analyzeFailures(input) {
    const { testCase, code } = input;

    const recentFailures = testCase.executions
      .filter(e => e.status === 'failed')
      .slice(-5);

    if (recentFailures.length === 0) {
      return { success: true, analysis: 'No failures to analyze' };
    }

    const prompt = `Analyze test failures:

**Test Case:** ${testCase.title}

**Recent Failures:**
${recentFailures.map(f => `- ${f.errorMessage}`).join('\n')}

**Code:**
\`\`\`
${code}
\`\`\`

Provide:
1. Root cause
2. Suggested fix
3. Whether issue is in code or test`;

    const response = await this.aiProvider.execute(prompt, { maxTokens: 1500 });

    return {
      success: true,
      analysis: response
    };
  }

  /**
   * Run test suite (workflow)
   */
  async runTestSuite(entityId) {
    // Get test cases for task or story
    const testCases = await TestCase.find({
      $or: [
        { taskId: entityId },
        { storyId: entityId }
      ],
      status: { $ne: 'obsolete' }
    });

    if (testCases.length === 0) {
      return {
        success: true,
        message: 'No test cases to run'
      };
    }

    // Get code from task
    const task = await Task.findOne({ taskId: entityId });
    const code = task?.code?.content || '';

    // Execute all tests
    const results = [];
    for (const testCase of testCases) {
      const result = await this.executeSkill('executeTests', { testCase, code });
      results.push(result);

      // Validate pass matrix
      const validation = await this.executeSkill('validatePassMatrix', { testCase });

      if (validation.decision.needsIteration) {
        // Analyze failures
        const analysis = await this.executeSkill('analyzeFailures', { testCase, code });

        this.emit('test:needs-iteration', {
          testCaseId: testCase.testCaseId,
          taskId: entityId,
          analysis: analysis.analysis
        });
      } else if (validation.decision.approved) {
        testCase.approve('testing-agent', 'Passed validation criteria');
        await testCase.save();
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.testResult.status === 'passed').length,
      failed: results.filter(r => r.testResult.status === 'failed').length,
      passRate: 0
    };
    summary.passRate = summary.total > 0
      ? Math.round((summary.passed / summary.total) * 100)
      : 0;

    // Determine overall decision
    const approved = summary.passRate >= 80;

    if (approved && task) {
      task.status = 'completed';
      task.testing.testsPassed = summary.passed;
      task.testing.testsFailed = summary.failed;
      task.testing.testCoverage = summary.passRate;
      task.testing.lastTestRun = new Date();
      await task.save();

      this.emit('task:tests-passed', {
        taskId: task.taskId,
        passRate: summary.passRate
      });
    } else if (task) {
      task.status = 'revision';
      task.testing.testsPassed = summary.passed;
      task.testing.testsFailed = summary.failed;
      await task.save();

      this.emit('task:tests-failed', {
        taskId: task.taskId,
        passRate: summary.passRate
      });
    }

    return {
      success: true,
      approved,
      summary,
      results
    };
  }

  /**
   * Generate tests for task
   */
  async generateTestsForTask(taskId) {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const testCases = await TestCase.find({ taskId: task._id });

    const generated = [];
    for (const testCase of testCases) {
      const result = await this.executeSkill('generateTestCode', {
        testCase,
        framework: testCase.automation.framework || 'jest'
      });
      generated.push(result);
    }

    return {
      success: true,
      generated: generated.length,
      testCases
    };
  }

  /**
   * Validate test results
   */
  async validateTestResults(testCaseId) {
    const testCase = await TestCase.findOne({ testCaseId });
    if (!testCase) throw new Error(`TestCase ${testCaseId} not found`);

    return await this.executeSkill('validatePassMatrix', { testCase });
  }
}

export default TestingAgent;
