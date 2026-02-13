import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';
import * as api from '../../services/api';

vi.mock('../../services/api');

const mockApi = api as any;

describe('Dashboard Component', () => {
  const mockMetrics = {
    news: {
      total: 1000,
      published: 800,
      pendingApproval: 50,
      breaking: 10
    },
    queues: {
      'feed-queue': {
        queue: 'feed-queue',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 0,
        total: 108
      }
    }
  };

  const mockHealth = {
    status: 'healthy' as const,
    timestamp: new Date(),
    uptime: 12345,
    checks: {
      database: { healthy: true },
      queue: { healthy: true },
      system: {
        healthy: true,
        cpu: { cores: 4, loadAvg: [0.5, 0.6, 0.7] },
        memory: {
          total: '8GB',
          used: '4GB',
          free: '4GB',
          usagePercent: '50%'
        },
        uptime: { system: 123456, process: 12345 },
        platform: 'linux',
        nodeVersion: 'v20.0.0'
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getSystemMetrics.mockResolvedValue({ data: mockMetrics });
    mockApi.getHealth.mockResolvedValue(mockHealth);
  });

  describe('Rendering', () => {
    test('should render dashboard title', async () => {
      render(<Dashboard />);
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    test('should render subtitle', async () => {
      render(<Dashboard />);
      expect(screen.getByText('Autonomous AI Newsroom Overview')).toBeTruthy();
    });

    test('should show loading state initially', () => {
      render(<Dashboard />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    test('should hide loading state after data loads', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeNull();
      });
    });
  });

  describe('Data Loading', () => {
    test('should fetch metrics on mount', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockApi.getSystemMetrics).toHaveBeenCalled();
      });
    });

    test('should fetch health on mount', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockApi.getHealth).toHaveBeenCalled();
      });
    });

    test('should display metrics data', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1000')).toBeTruthy(); // Total news
        expect(screen.getByText('800')).toBeTruthy();  // Published
        expect(screen.getByText('50')).toBeTruthy();   // Pending approval
        expect(screen.getByText('10')).toBeTruthy();   // Breaking
      });
    });

    test('should display health status', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeTruthy();
      });
    });

    test('should handle API errors gracefully', async () => {
      mockApi.getSystemMetrics.mockRejectedValue(new Error('API Error'));
      mockApi.getHealth.mockRejectedValue(new Error('API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Dashboard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('System Health Display', () => {
    test('should show healthy status with green indicator', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const healthyElements = screen.getAllByText('Healthy');
        expect(healthyElements.length).toBeGreaterThan(0);
      });
    });

    test('should show degraded status correctly', async () => {
      const degradedHealth = {
        ...mockHealth,
        status: 'degraded' as const
      };
      mockApi.getHealth.mockResolvedValue(degradedHealth);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Degraded')).toBeTruthy();
      });
    });

    test('should show unhealthy status correctly', async () => {
      const unhealthyHealth = {
        ...mockHealth,
        status: 'unhealthy' as const
      };
      mockApi.getHealth.mockResolvedValue(unhealthyHealth);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Unhealthy')).toBeTruthy();
      });
    });
  });

  describe('News Metrics Cards', () => {
    test('should display total news count', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total News')).toBeTruthy();
        expect(screen.getByText('1000')).toBeTruthy();
      });
    });

    test('should display published count', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Published')).toBeTruthy();
        expect(screen.getByText('800')).toBeTruthy();
      });
    });

    test('should display pending approval count', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pending Approval')).toBeTruthy();
        expect(screen.getByText('50')).toBeTruthy();
      });
    });

    test('should display breaking news count', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Breaking News')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy();
      });
    });
  });

  describe('Queue Statistics', () => {
    test('should display queue information', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('feed-queue')).toBeTruthy();
      });
    });

    test('should show queue metrics', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Waiting: 5/)).toBeTruthy();
        expect(screen.getByText(/Active: 2/)).toBeTruthy();
      });
    });
  });

  describe('Auto Refresh', () => {
    test('should set up interval for auto refresh', async () => {
      vi.useFakeTimers();

      render(<Dashboard />);

      await waitFor(() => {
        expect(mockApi.getSystemMetrics).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockApi.getSystemMetrics).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    test('should clean up interval on unmount', async () => {
      vi.useFakeTimers();

      const { unmount } = render(<Dashboard />);

      await waitFor(() => {
        expect(mockApi.getSystemMetrics).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward 30 seconds after unmount
      vi.advanceTimersByTime(30000);

      // Should still be 1 call (no more calls after unmount)
      expect(mockApi.getSystemMetrics).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null metrics gracefully', async () => {
      mockApi.getSystemMetrics.mockResolvedValue({ data: null });

      render(<Dashboard />);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeNull();
      });
    });

    test('should handle missing queue data', async () => {
      const metricsWithoutQueues = {
        news: mockMetrics.news,
        queues: {}
      };
      mockApi.getSystemMetrics.mockResolvedValue({ data: metricsWithoutQueues });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1000')).toBeTruthy();
      });
    });

    test('should handle undefined health checks', async () => {
      const healthWithoutChecks = {
        status: 'healthy' as const,
        timestamp: new Date(),
        uptime: 12345,
        checks: {}
      };
      mockApi.getHealth.mockResolvedValue(healthWithoutChecks);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeTruthy();
      });
    });
  });
});
