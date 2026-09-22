import { apiClient } from './apiClient';

export type Note = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export function listNotes(equipmentId: string): Promise<Note[]> {
  return apiClient.get<Note[]>(`/api/equipment/${equipmentId}/notes`);
}

export function addNote(equipmentId: string, data: { authorId: string; body: string }): Promise<Note> {
  return apiClient.post<Note, { authorId: string; body: string }>(`/api/equipment/${equipmentId}/notes`, data);
}
