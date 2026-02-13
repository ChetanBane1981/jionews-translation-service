import { BaseAgent } from '../BaseAgent.js';
import { EventEmitter } from 'events';

// Mock logger to suppress console output during tests
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('BaseAgent', () => {
  let agent;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      autoRetry: true,
      model: 'test-model'
    };
    agent = new BaseAgent('test-agent', mockConfig);
  });

  afterEach(() => {
    if (agent && agent.status !== 'shutdown') {
      agent.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('test-agent');
    });

    test('should store config', () => {
      expect(agent.config).toEqual(mockConfig);
    });

    test('should initialize with idle status', () => {
      expect(agent.status).toBe('idle');
    });

    test('should initialize metrics with zero values', () => {
      expect(agent.metrics.tasksProcessed).toBe(0);
      expect(agent.metrics.tasksSucceeded).toBe(0);
      expect(agent.metrics.tasksFailed).toBe(0);
      expect(agent.metrics.avgProcessingTime).toBe(0);
      expect(agent.metrics.lastActivity).toBeNull();
    });

    test('should extend EventEmitter', () => {
      expect(agent).toBeInstanceOf(EventEmitter);
    });

    test('should set status to ready after initialize', async () => {
      await agent.initialize();
      expect(agent.status).toBe('ready');
    });

    test('should emit agent:ready event on initialize', async () => {
      const eventPromise = new Promise((resolve) => {
        agent.on('agent:ready', (data) => {
          expect(data.agent).toBe('test-agent');
          resolve();
        });
      });

      await agent.initialize();
      await eventPromise;
    });
  });

  describe('Health Monitoring', () => {
    test('should return health status', () => {
      const health = agent.getHealth();
      expect(health).toHaveProperty('agent', 'test-agent');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('uptime');
    });

    test('should include all metrics in health check', () => {
      const health = agent.getHealth();
      expect(health.metrics).toHaveProperty('tasksProcessed');
      expect(health.metrics).toHaveProperty('tasksSucceeded');
      expect(health.metrics).toHaveProperty('tasksFailed');
      expect(health.metrics).toHaveProperty('avgProcessingTime');
      expect(health.metrics).toHaveProperty('lastActivity');
    });

    test('should return status in health check', () => {
      agent.status = 'processing';
      const health = agent.getHealth();
      expect(health.status).toBe('processing');
    });
  });

  describe('Task Processing', () => {
    test('should process task successfully', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          return { result: 'success', data: task.data };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      const task = { id: '123', data: { text: 'test' } };

      const result = await testAgent.processTask(task);

      expect(result.success).toBe(true);
      expect(result.result.result).toBe('success');
      expect(testAgent.metrics.tasksSucceeded).toBe(1);
      expect(testAgent.metrics.tasksProcessed).toBe(1);
      expect(testAgent.status).toBe('ready');

      testAgent.shutdown();
    });

    test('should handle task failure', async () => {
      class FailingAgent extends BaseAgent {
        async execute(task) {
          throw new Error('Task failed');
        }
      }

      const failingAgent = new FailingAgent('failing', mockConfig);
      const task = { id: '123', data: {} };

      const result = await failingAgent.processTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Task failed');
      expect(failingAgent.metrics.tasksFailed).toBe(1);
      expect(failingAgent.status).toBe('error');

      failingAgent.shutdown();
    });

    test('should emit task:completed event on success', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      const task = { id: '123', data: {} };

      // Verify event is emitted
      let eventReceived = false;
      testAgent.once('task:completed', (data) => {
        eventReceived = true;
        expect(data.agent).toBe('test');
        expect(data.result.success).toBe(true);
      });

      await testAgent.processTask(task);

      // Event should have been emitted synchronously
      expect(eventReceived).toBe(true);

      testAgent.shutdown();
    });

    test('should emit task:failed event on error', async () => {
      class FailingAgent extends BaseAgent {
        async execute(task) {
          throw new Error('Test error');
        }
      }

      const failingAgent = new FailingAgent('failing', mockConfig);
      const task = { id: '123', data: {} };

      const eventPromise = new Promise((resolve) => {
        failingAgent.on('task:failed', (data) => {
          expect(data.agent).toBe('failing');
          expect(data.error).toBe('Test error');
          resolve();
        });
      });

      await failingAgent.processTask(task);
      await eventPromise;

      failingAgent.shutdown();
    });

    test('should update avgProcessingTime', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      await testAgent.processTask({ id: '123', data: {} });

      expect(testAgent.metrics.avgProcessingTime).toBeGreaterThan(0);
      testAgent.shutdown();
    });

    test('should set status to processing during execution', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          expect(this.status).toBe('processing');
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      await testAgent.processTask({ id: '123', data: {} });
      testAgent.shutdown();
    });

    test('should update lastActivity timestamp', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      expect(testAgent.metrics.lastActivity).toBeNull();

      await testAgent.processTask({ id: '123', data: {} });

      expect(testAgent.metrics.lastActivity).toBeInstanceOf(Date);
      testAgent.shutdown();
    });
  });

  describe('Execute Method', () => {
    test('should throw error if execute not implemented', async () => {
      await expect(agent.execute({})).rejects.toThrow('execute() must be implemented by test-agent');
    });
  });

  describe('Decision Making', () => {
    test('should have makeDecision method', () => {
      expect(typeof agent.makeDecision).toBe('function');
    });

    test('should return default approval', async () => {
      const decision = await agent.makeDecision({}, {});
      expect(decision).toHaveProperty('approved');
      expect(decision).toHaveProperty('reasoning');
    });
  });

  describe('Human Approval', () => {
    test('should emit human:approval:required event', (done) => {
      agent.on('human:approval:required', (data) => {
        expect(data.agent).toBe('test-agent');
        expect(data.reason).toBe('test reason');
        done();
      });

      agent.requestHumanApproval({ id: '123' }, 'test reason');
    });

    test('should resolve when approval received', async () => {
      const approvalPromise = agent.requestHumanApproval({ id: '123' }, 'test');

      // Simulate human approval
      setTimeout(() => {
        agent.emit('human:approval:received', { approved: true });
      }, 10);

      const result = await approvalPromise;
      expect(result.approved).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      const task = { id: '123' };

      await agent.handleError(error, task);

      // Should not throw
      expect(true).toBe(true);
    });

    test('should emit agent:critical:error when retry disabled', async () => {
      const noRetryAgent = new BaseAgent('no-retry', { autoRetry: false });
      const error = new Error('Test error');
      const task = { id: '123' };

      const eventPromise = new Promise((resolve) => {
        noRetryAgent.on('agent:critical:error', (data) => {
          expect(data.agent).toBe('no-retry');
          resolve();
        });
      });

      await noRetryAgent.handleError(error, task);
      await eventPromise;

      noRetryAgent.shutdown();
    });
  });

  describe('Shutdown', () => {
    test('should set status to shutdown', async () => {
      await agent.shutdown();
      expect(agent.status).toBe('shutdown');
    });

    test('should emit agent:shutdown event', async () => {
      const eventPromise = new Promise((resolve) => {
        agent.on('agent:shutdown', (data) => {
          expect(data.agent).toBe('test-agent');
          resolve();
        });
      });

      await agent.shutdown();
      await eventPromise;
    });
  });

  describe('Metrics Update', () => {
    test('should update average processing time correctly', () => {
      agent.metrics.tasksProcessed = 2; // Already processed 2 tasks
      agent.metrics.avgProcessingTime = 100;

      agent.updateAvgProcessingTime(200); // Third task takes 200ms

      // (100 * 1 + 200) / 2 = 150
      expect(agent.metrics.avgProcessingTime).toBe(150);
    });

    test('should handle first task processing time', () => {
      agent.metrics.tasksProcessed = 1;
      agent.metrics.avgProcessingTime = 0;

      agent.updateAvgProcessingTime(100);

      expect(agent.metrics.avgProcessingTime).toBe(100);
    });
  });
});
