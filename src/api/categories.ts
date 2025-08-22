import { api } from './client';
import type { CategoryDto } from './types';

export const CategoriesApi = {
  list: () => api.request<CategoryDto[]>('/categories'),
  hierarchy: () => api.request<CategoryDto[]>('/categories/hierarchy'),
  getById: (id: number) => api.request<CategoryDto>(`/categories/${id}`),
};
