import { api } from './client';
import type { UserDto } from './types';

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserDto;
}

export const AuthApi = {
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: number;
  }) => api.request<AuthResponse>('/auth/register', { method: 'POST', body: payload }),
  login: (payload: { email: string; password: string }) =>
    api.request<AuthResponse>('/auth/login', { method: 'POST', body: payload }),
  me: () => api.request<UserDto>('/auth/me'),
  validateToken: (token: string) =>
    api.request<boolean>('/auth/validate-token', { method: 'POST', body: token }),
};
