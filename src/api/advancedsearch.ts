import { api } from './client';
import type { TicketResponseDto } from './types';

export interface AdvancedSearchRequest {
  keywords?: string;
  status?: number;
  priority?: number;
  categoryId?: number;
  assignedAgentId?: number;
  customerId?: number;
  createdAfter?: string;
  createdBefore?: string;
  hasAttachments?: boolean;
  tags?: string[];
  sortBy?: 'created' | 'updated' | 'priority' | 'status' | 'title';
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface AdvancedSearchResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  tickets: TicketResponseDto[];
}

export interface SuggestionsResponse {
  ticketNumbers: Array<{ ticketNumber: string; title: string }>;
  customerNames: Array<{ id: number; fullName: string; email: string }>;
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string; color?: string }>;
}

export const AdvancedSearchApi = {
  searchTickets: (payload: AdvancedSearchRequest) =>
    api.request<AdvancedSearchResponse>('/advancedsearch/tickets', {
      method: 'POST',
      body: payload,
    }),
  suggestions: (term: string) =>
    api.request<SuggestionsResponse>('/advancedsearch/suggestions', { params: { term } }),
};
