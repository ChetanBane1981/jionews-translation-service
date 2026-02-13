import { describe, test, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as api from '../api';

vi.mock('axios');

const mockedAxios = axios as any;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check', () => {
    test('should fetch health status', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockHealth }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getHealth();
      expect(result).toEqual(mockHealth);
    });
  });

  describe('News APIs', () => {
    test('getNews should fetch paginated news', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', title: 'News 1' },
          { id: '2', title: 'News 2' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          pages: 5
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getNews({ category: 'tech', limit: 20 });
      expect(result).toEqual(mockResponse);
    });

    test('getBreakingNews should fetch breaking news', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', title: 'Breaking 1', breaking: true }
        ]
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getBreakingNews();
      expect(result).toEqual(mockResponse);
    });

    test('getNewsByCategory should filter by category', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', title: 'Tech News', category: 'Technology' }
        ]
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getNewsByCategory('Technology');
      expect(result).toEqual(mockResponse);
    });

    test('getPersonalizedNews should fetch for specific user', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', title: 'Personalized News', relevanceScore: 85 }
        ]
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getPersonalizedNews('user123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Approval APIs', () => {
    test('getApprovalQueue should fetch pending approvals', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', title: 'Pending News', approvalStatus: 'pending' }
        ]
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getApprovalQueue();
      expect(result).toEqual(mockResponse);
    });

    test('approveNews should approve a news item', async () => {
      const mockResponse = {
        success: true,
        data: { message: 'News approved successfully' }
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.approveNews('news123', 'admin');
      expect(result).toEqual(mockResponse);
    });

    test('rejectNews should reject with reason', async () => {
      const mockResponse = {
        success: true,
        data: { message: 'News rejected successfully' }
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.rejectNews('news123', 'admin', 'Low credibility');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Agent APIs', () => {
    test('getAgentStatus should fetch agent metrics', async () => {
      const mockResponse = {
        success: true,
        data: {
          queues: {
            'feed-queue': { waiting: 10, active: 2, completed: 100 }
          },
          recentLogs: [
            { agentName: 'feed', eventType: 'task_completed' }
          ]
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getAgentStatus();
      expect(result).toEqual(mockResponse);
    });

    test('getAgentStats should fetch specific agent stats', async () => {
      const mockResponse = {
        success: true,
        data: {
          tasksProcessed: 500,
          avgProcessingTime: 120
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getAgentStats('credibility', 24);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Metrics APIs', () => {
    test('getSystemMetrics should fetch system metrics', async () => {
      const mockResponse = {
        success: true,
        data: {
          news: {
            total: 1000,
            published: 800,
            pendingApproval: 50,
            breaking: 10
          },
          queues: {}
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getSystemMetrics();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('User APIs', () => {
    test('getUserProfile should fetch user data', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'user123',
          email: 'user@example.com',
          preferredLanguage: 'en'
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.getUserProfile('user123');
      expect(result).toEqual(mockResponse);
    });

    test('updateUserPreferences should update preferences', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'user123',
          preferredLanguage: 'hi'
        }
      };

      mockedAxios.create.mockReturnValue({
        put: vi.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      const result = await api.updateUserPreferences('user123', {
        preferredLanguage: 'hi'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Network error')),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      await expect(api.getHealth()).rejects.toThrow('Network error');
    });

    test('should handle API errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      };

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
        interceptors: {
          response: {
            use: vi.fn()
          }
        }
      });

      await expect(api.getNews()).rejects.toThrow();
    });
  });
});
