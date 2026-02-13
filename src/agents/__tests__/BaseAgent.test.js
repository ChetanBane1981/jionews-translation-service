import { BaseAgent } from '../BaseAgent.js';
import { EventEmitter } from 'events';

describe('BaseAgent', () => {
  let agent;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      retryAttempts: 3,
      retryDelay: 100
    };
    agent = new BaseAgent('test-agent', mockConfig);
  });

  afterEach(() => {
    if (agent) {
      agent.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should create agent with correct name', () => {
      expect(agent.name).toBe('test-agent');
    });

    test('should initialize with idle status', () => {
      expect(agent.status).toBe('idle');
    });

    test('should initialize metrics with zero values', () => {
      expect(agent.metrics.tasksProcessed).toBe(0);
      expect(agent.metrics.tasksSucceeded).toBe(0);
      expect(agent.metrics.tasksFailed).toBe(0);
    });

    test('should extend EventEmitter', () => {
      expect(agent).toBeInstanceOf(EventEmitter);
    });

    test('should set retryAttempts from config', () => {
      expect(agent.retryAttempts).toBe(3);
    });
  });

  describe('Status Management', () => {
    test('should update status', () => {
      agent.updateStatus('processing');
      expect(agent.status).toBe('processing');
    });

    test('should emit status:changed event', (done) => {
      agent.on('status:changed', (data) => {
        expect(data.agent).toBe('test-agent');
        expect(data.status).toBe('ready');
        done();
      });
      agent.updateStatus('ready');
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

    test('should calculate uptime correctly', (done) => {
      setTimeout(() => {
        const health = agent.getHealth();
        expect(health.uptime).toBeGreaterThan(0);
        done();
      }, 100);
    });

    test('should include all metrics in health check', () => {
      const health = agent.getHealth();
      expect(health.metrics).toHaveProperty('tasksProcessed');
      expect(health.metrics).toHaveProperty('tasksSucceeded');
      expect(health.metrics).toHaveProperty('tasksFailed');
      expect(health.metrics).toHaveProperty('avgProcessingTime');
    });
  });

  describe('Task Processing', () => {
    test('should process task successfully', async () => {
      // Create a test agent with execute method
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
      expect(failingAgent.metrics.tasksFailed).toBeGreaterThan(0);

      failingAgent.shutdown();
    });

    test('should emit task:completed event on success', (done) => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);

      testAgent.on('task:completed', (data) => {
        expect(data.agent).toBe('test');
        expect(data.result.success).toBe(true);
        testAgent.shutdown();
        done();
      });

      testAgent.processTask({ id: '123', data: {} });
    });

    test('should update avgProcessingTime', async () => {
      class TestAgent extends BaseAgent {
        async execute(task) {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { result: 'success' };
        }
      }

      const testAgent = new TestAgent('test', mockConfig);
      await testAgent.processTask({ id: '123', data: {} });

      expect(testAgent.metrics.avgProcessingTime).toBeGreaterThan(0);
      testAgent.shutdown();
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

    test('should increment failed tasks on error', async () => {
      class ErrorAgent extends BaseAgent {
        async execute(task) {
          throw new Error('Test error');
        }
      }

      const errorAgent = new ErrorAgent('error', mockConfig);
      await errorAgent.processTask({ id: '123', data: {} });

      expect(errorAgent.metrics.tasksFailed).toBeGreaterThan(0);
      errorAgent.shutdown();
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed tasks', async () => {
      let attempts = 0;

      class RetryAgent extends BaseAgent {
        async execute(task) {
          attempts++;
          if (attempts < 2) {
            throw new Error('Retry needed');
          }
          return { result: 'success after retry' };
        }
      }

      const retryAgent = new RetryAgent('retry', { retryAttempts: 3, retryDelay: 10 });
      const result = await retryAgent.processTask({ id: '123', data: {} });

      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
      retryAgent.shutdown();
    });
  });

  describe('Shutdown', () => {
    test('should set status to shutdown', () => {
      agent.shutdown();
      expect(agent.status).toBe('shutdown');
    });

    test('should emit shutdown event', (done) => {
      agent.on('agent:shutdown', (data) => {
        expect(data.agent).toBe('test-agent');
        done();
      });
      agent.shutdown();
    });
  });

  describe('Utility Methods', () => {
    test('should have delay method', async () => {
      const start = Date.now();
      await agent.delay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small variance
    });
  });
});
