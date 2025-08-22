import { api } from './client';
import type {
  AddCommentDto,
  CreateTicketDto,
  TicketFilters,
  TicketResponseDto,
  UserDto,
  CommentDto,
} from './types';

export const TicketsApi = {
  list: (filters?: TicketFilters) =>
    api.request<TicketResponseDto[]>('/tickets', {
      params: {
        status: filters?.status,
        customerId: filters?.customerId,
        agentId: filters?.agentId,
        search: filters?.search,
      },
    }),

  getById: (id: number) => api.request<TicketResponseDto>(`/tickets/${id}`),

  create: (payload: CreateTicketDto) =>
    api.request<TicketResponseDto>('/tickets', { method: 'POST', body: payload }),

  updateStatus: (id: number, status: number, userId: number) =>
    api.request<TicketResponseDto>(`/tickets/${id}/status`, {
      method: 'PUT',
      body: status,
      params: { userId },
    }),

  assign: (id: number, agentId: number, assignedByUserId: number) =>
    api.request<TicketResponseDto>(`/tickets/${id}/assign`, {
      method: 'PUT',
      body: agentId,
      params: { assignedByUserId },
    }),

  addComment: (id: number, payload: AddCommentDto, userId: number) =>
    api.request<CommentDto>(`/tickets/${id}/comments`, {
      method: 'POST',
      body: payload,
      params: { userId },
    }),

  suggestAgent: (id: number) => api.request<UserDto>(`/tickets/${id}/suggest-agent`),
};
