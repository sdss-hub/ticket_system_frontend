import { api } from './client';
import type { AttachmentDto } from './types';

export interface UploadResponse {
  message: string;
  attachment: AttachmentDto;
}

export const AttachmentsApi = {
  upload: (ticketId: number, file: File, userId: number) => {
    const form = new FormData();
    form.append('file', file);
    return api.request<UploadResponse>(`/attachments/upload/${ticketId}`, {
      method: 'POST',
      params: { userId },
      body: form,
    });
  },
  downloadUrl: (id: number) => `/attachments/${id}/download`,
  listByTicket: (ticketId: number) =>
    api.request<AttachmentDto[]>(`/attachments/ticket/${ticketId}`),
  delete: (id: number, userId: number) =>
    api.request<{ message: string }>(`/attachments/${id}`, { method: 'DELETE', params: { userId } }),
};
