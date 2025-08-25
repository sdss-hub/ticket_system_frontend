import { api } from './client';
import type { UserDto } from './types';

export interface CategorizeRequest {
  title: string;
  description: string;
}

export interface CategorizeResponse {
  categoryId: number;
  categoryName: string;
  confidence: number;
}

export interface SuggestResponseRequest {
  ticketContent: string;
  customerMessage: string;
}

export interface SuggestResponseResult {
  suggestedResponse: string;
  confidence: number;
}

export interface AgentSuggestionResult {
  agentId: number;
  agentName: string;
  confidence: number;
}

export interface TicketInsightDto {
  sentiment: number;
  categoryPrediction: { categoryId: number; categoryName: string; confidence: number };
  priorityPrediction: string;
}

export interface AnalyzeTicketResult {
  analysis: string;
  confidence: number;
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
