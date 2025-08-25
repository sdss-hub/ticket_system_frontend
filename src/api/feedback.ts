import { api } from './client';
import type { FeedbackDto } from './types';

export interface CreateFeedbackDto {
  ticketId: number;
  customerId: number;
  rating: number;
  comment: string;
}

export const FeedbackApi = {
  create: (payload: CreateFeedbackDto) =>
    api.request<FeedbackDto>('/feedback', { method: 'POST', body: payload }),
  
  getByTicket: (ticketId: number) =>
    api.request<FeedbackDto | null>(`/feedback/ticket/${ticketId}`),
    
  list: () => api.request<FeedbackDto[]>('/feedback'),
};
