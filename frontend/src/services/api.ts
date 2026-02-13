import axios, { AxiosInstance } from 'axios';
import type {
  NewsItem,
  UserProfile,
  AgentLog,
  QueueStats,
  SystemHealth,
  SystemMetrics,
  APIResponse,
  PaginatedResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Health Check
export const getHealth = (): Promise<SystemHealth> =>
  api.get('/health');

// News APIs
export const getNews = (params: {
  category?: string;
  limit?: number;
  page?: number;
} = {}): Promise<PaginatedResponse<NewsItem>> =>
  api.get('/api/news', { params });

export const getBreakingNews = (): Promise<APIResponse<NewsItem[]>> =>
  api.get('/api/news/breaking');

export const getNewsByCategory = (
  category: string,
  limit = 20
): Promise<APIResponse<NewsItem[]>> =>
  api.get(`/api/news/category/${category}`, { params: { limit } });

export const getPersonalizedNews = (
  userId: string,
  limit = 20
): Promise<APIResponse<NewsItem[]>> =>
  api.get(`/api/news/personalized/${userId}`, { params: { limit } });

// Approval APIs
export const getApprovalQueue = (): Promise<APIResponse<NewsItem[]>> =>
  api.get('/api/approval-queue');

export const approveNews = (
  id: string,
  approver: string
): Promise<APIResponse<{ message: string }>> =>
  api.post(`/api/approval/${id}`, { action: 'approve', approver });

export const rejectNews = (
  id: string,
  approver: string,
  reason: string
): Promise<APIResponse<{ message: string }>> =>
  api.post(`/api/approval/${id}`, { action: 'reject', approver, reason });

// Agent APIs
export const getAgentStatus = (): Promise<APIResponse<{
  queues: Record<string, QueueStats>;
  recentLogs: AgentLog[];
}>> =>
  api.get('/api/agents/status');

export const getAgentStats = (
  agentName: string,
  hours = 24
): Promise<APIResponse<any>> =>
  api.get(`/api/agents/${agentName}/stats`, { params: { hours } });

// Metrics APIs
export const getSystemMetrics = (): Promise<APIResponse<SystemMetrics>> =>
  api.get('/api/metrics');

// User APIs
export const getUserProfile = (userId: string): Promise<APIResponse<UserProfile>> =>
  api.get(`/api/user/${userId}`);

export const updateUserPreferences = (
  userId: string,
  preferences: Partial<UserProfile>
): Promise<APIResponse<UserProfile>> =>
  api.put(`/api/user/${userId}/preferences`, preferences);

// Error handling interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
