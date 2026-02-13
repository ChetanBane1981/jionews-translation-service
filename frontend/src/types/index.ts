// News Item Types
export interface NewsItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  author?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceTrust?: number;
  publishedAt: Date;
  fetchedAt: Date;
  processedAt?: Date;

  // Detection Agent
  breaking?: boolean;
  importanceScore?: number;
  urgency?: 'Low' | 'Medium' | 'High' | 'Critical';
  category?: 'Politics' | 'Business' | 'Technology' | 'Sports' | 'Entertainment' | 'Health' | 'Other';
  detectionReasoning?: string;

  // Cluster Agent
  isDuplicate?: boolean;
  clusterId?: string;
  originalId?: string;

  // Moderation Agent
  moderationPassed?: boolean;
  violations?: string[];

  // Credibility Agent
  credibilityScore?: number;
  fakeRisk?: 'Low' | 'Medium' | 'High';
  trustScore?: number;
  credibilityReasoning?: string;
  redFlags?: string[];

  // Summary Agent
  summary?: string;
  generatedAt?: Date;

  // Translation Agent
  translations?: Translation[];

  // Personalization Agent
  personalizedVersions?: PersonalizedVersions;
  relevanceScore?: number;

  // Ranking Agent
  rankingScore?: number;
  isTrending?: boolean;
  engagementScore?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';

  // Publishing
  published?: boolean;
  autoPublished?: boolean;

  // Human Approval
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: Date;

  // Pipeline Status
  pipelineStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  currentStage?: string;
  failedAt?: string;
  errorMessage?: string;
}

export interface Translation {
  language: string;
  languageName: string;
  title: string;
  summary: string;
  quality: number;
  provider?: string;
}

export interface PersonalizedVersions {
  general?: { title: string; priority: number };
  finance?: { title: string; priority: number };
  politics?: { title: string; priority: number };
  tech?: { title: string; priority: number };
}

// User Types
export interface UserProfile {
  userId: string;
  name?: string;
  email: string;
  preferredLanguage?: string;
  preferredLanguages?: string[];
  interests?: string[];
  userType?: 'general' | 'finance' | 'politics' | 'tech';
  readArticles?: ReadArticle[];
  categoryScores?: CategoryScores;
  totalArticlesRead?: number;
  averageReadTime?: number;
  lastActiveAt?: Date;
  notifications?: NotificationSettings;
}

export interface ReadArticle {
  newsId: string;
  readAt: Date;
  timeSpent: number;
}

export interface CategoryScores {
  politics: number;
  business: number;
  technology: number;
  sports: number;
  entertainment: number;
  health: number;
}

export interface NotificationSettings {
  breaking: boolean;
  daily: boolean;
  weekly: boolean;
}

// Agent Types
export interface AgentHealth {
  agent: string;
  status: 'idle' | 'ready' | 'processing' | 'error' | 'shutdown';
  metrics: AgentMetrics;
  uptime: number;
}

export interface AgentMetrics {
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  avgProcessingTime: number;
  lastActivity: Date | null;
}

export interface AgentLog {
  agentName: string;
  taskId?: string;
  newsId?: string;
  eventType: 'task_started' | 'task_completed' | 'task_failed' | 'decision_made' | 'approval_requested' | 'error' | 'warning';
  status: 'success' | 'failure' | 'warning';
  message?: string;
  data?: any;
  error?: string;
  stackTrace?: string;
  duration?: number;
  memoryUsage?: number;
  timestamp: Date;
}

// Queue Types
export interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: {
    database?: HealthCheck;
    queue?: HealthCheck;
    system?: SystemHealthCheck;
    [key: string]: HealthCheck | SystemHealthCheck | undefined;
  };
}

export interface HealthCheck {
  healthy: boolean;
  error?: string;
  [key: string]: any;
}

export interface SystemHealthCheck extends HealthCheck {
  cpu: {
    cores: number;
    loadAvg: number[];
  };
  memory: {
    total: string;
    used: string;
    free: string;
    usagePercent: string;
  };
  uptime: {
    system: number;
    process: number;
  };
  platform: string;
  nodeVersion: string;
}

// Metrics Types
export interface SystemMetrics {
  news: {
    total: number;
    published: number;
    pendingApproval: number;
    breaking: number;
  };
  queues: Record<string, QueueStats>;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Component Props Types
export interface NewsCardProps {
  news: NewsItem;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export interface AgentCardProps {
  agentName: string;
  health: AgentHealth;
  queueStats?: QueueStats;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}
