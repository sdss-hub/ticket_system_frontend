import { api } from './client';

export interface BasicHealthDto {
  status: 'Healthy' | 'Unhealthy' | string;
  timestamp: string;
  version: string;
  environment: string;
}

export interface DetailedHealthDto {
  overallStatus: 'Healthy' | 'Unhealthy' | string;
  timestamp: string;
  healthChecks: Array<{ component: string; status: string; details?: string }>;
  systemInfo: { machineName: string; osVersion: string; processorCount: number; dotNetVersion: string };
}

export interface DatabaseInfoDto {
  userCount: number;
  ticketCount: number;
  categoryCount: number;
  ticketsByStatus: Array<{ status: number; count: number }>;
  ticketsByPriority: Array<{ priority: number; count: number }>;
  usersByRole: Array<{ role: number; count: number }>;
  recentTickets: Array<{ id: number; ticketNumber: string; title: string; status: number }>;
  recentComments: Array<{ id: number; ticketId: number; commentPreview: string }>;
}

export const HealthApi = {
  basic: () => api.request<BasicHealthDto>('/health'),
  detailed: () => api.request<DetailedHealthDto>('/health/detailed'),
  database: () => api.request<DatabaseInfoDto>('/health/database'),
};
