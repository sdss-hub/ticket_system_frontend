import { api } from './client';
import type { UserDto } from './types';

export interface CategorizeRequest {
  title: string;
  description: string;
}

export interface CategorizeResponse {
  suggestedCategory: string;
  suggestedPriority: number;
  sentimentScore: number;
  sentimentLabel: string;
  confidence: { categorization: number; priority: number; sentiment: number };
  processedAt: string;
}

export interface SuggestResponseRequest {
  ticketContent: string;
  customerMessage: string;
}

export interface SuggestResponseResult {
  suggestedResponse: string;
  confidence: number;
  generatedAt: string;
  tips: string[];
}

export interface AgentSuggestionResult {
  suggestedAgent: UserDto;
  reasoning: string;
  confidence: number;
  alternativeAgents: Array<{ id: number; fullName: string; currentWorkload: number }>;
  processedAt: string;
}

export interface TicketInsightDto {
  id: number;
  insightType: 'Categorization' | 'Sentiment' | 'Priority';
  confidence: number;
  data: string; // JSON string
  createdAt: string;
}

export interface AnalyzeTicketResult {
  ticketId: number;
  analysis: {
    suggestedCategory: string;
    suggestedPriority: number;
    sentimentScore: number;
    sentimentLabel: string;
  };
  insightsCreated: number;
  processedAt: string;
}

export const AiApi = {
  categorize: (payload: CategorizeRequest) =>
    api.request<CategorizeResponse>('/ai/categorize', { method: 'POST', body: payload }),
  suggestResponse: (payload: SuggestResponseRequest) =>
    api.request<SuggestResponseResult>('/ai/suggest-response', { method: 'POST', body: payload }),
  suggestAgent: (ticketId: number) =>
    api.request<AgentSuggestionResult>(`/ai/suggest-agent/${ticketId}`, { method: 'POST' }),
  insights: (ticketId: number) => api.request<TicketInsightDto[]>(`/ai/insights/${ticketId}`),
  analyzeTicket: (ticketId: number) =>
    api.request<AnalyzeTicketResult>(`/ai/analyze-ticket/${ticketId}`, { method: 'POST' }),
};
