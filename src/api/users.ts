import { api } from './client';
import type { UserDto } from './types';
import { UserRole } from './types';

export const UsersApi = {
  list: (role?: UserRole) => api.request<UserDto[]>('/users', { params: { role } }),
  getById: (id: number) => api.request<UserDto>(`/users/${id}`),
  availableAgents: () => api.request<UserDto[]>('/users/agents/available'),
};
