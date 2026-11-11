import { api } from './api';

export const readingProgressService = {
  async getProgress(novelId) {
    const response = await api.get(`/reading-progress/${novelId}`);
    return response.data;
  },

  async updateProgress(novelId, data) {
    const response = await api.post(`/reading-progress/${novelId}`, data);
    return response.data;
  },

  async getHistory(params = {}) {
    const response = await api.get('/reading-progress/history', { params });
    return response.data;
  },

  async continueReading() {
    const response = await api.get('/reading-progress/continue');
    return response.data;
  },

  async getCompleted() {
    const response = await api.get('/reading-progress/completed');
    return response.data;
  },

  async getAll() {
    const response = await api.get('/reading-progress');
    return response.data;
  },

  async delete(novelId) {
    const response = await api.delete(`/reading-progress/${novelId}`);
    return response.data;
  },
};