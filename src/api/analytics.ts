import { api } from './client';

export interface DashboardOverviewDto {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  overdueTickets: number;
  ticketsByStatus: Array<{ status: number; count: number }>;
  ticketsByPriority: Array<{ priority: number; count: number }>;
  ticketsByCategory: Array<{ category: string; count: number }>;
  agentWorkload: Array<{ agentName: string; assignedTickets: number; resolvedThisWeek: number }>;
  ticketTrends: Array<{ date: string; created: number; resolved: number; inProgress: number }>;
  aiInsightsSummary: Array<{ insightType: string; count: number; avgConfidence: number }>;
}

export interface AgentPerformanceDto {
  agentId: number;
  agentName: string;
  email: string;
  skills: Array<{ name: string; proficiencyLevel: number }>;
  totalAssigned: number;
  currentlyAssigned: number;
  resolvedTotal: number;
  resolvedThisMonth: number;
  avgResolutionTimeHours: number;
  customerSatisfactionScore: number;
  lastActivity: string;
  isActive: boolean;
}

export interface CustomerInsightsDto {
  customerId: number;
  customerName: string;
  email: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  mostUsedCategories: Array<{ category: string; count: number }>;
  avgPriorityLevel: number;
  lastTicketDate: string;
  overallSentiment: number;
  joinDate: string;
}

export const AnalyticsApi = {
  dashboard: () => api.request<DashboardOverviewDto>('/analytics/dashboard'),
  agentPerformance: () => api.request<AgentPerformanceDto[]>('/analytics/agent-performance'),
  customerInsights: () => api.request<CustomerInsightsDto[]>('/analytics/customer-insights'),
};
