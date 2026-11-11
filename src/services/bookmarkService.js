import { api } from './api';

export const bookmarkService = {
  async getAll(params = {}) {
    const response = await api.get('/bookmarks', { params });
    return response.data;
  },

  async getCount() {
    const response = await api.get('/bookmarks/count');
    return response.data;
  },

  async checkStatus(novelId) {
    const response = await api.get(`/bookmarks/${novelId}/status`);
    return response.data;
  },

  async add(novelId) {
    const response = await api.post(`/bookmarks/${novelId}`);
    return response.data;
  },

  async remove(novelId) {
    const response = await api.delete(`/bookmarks/${novelId}`);
    return response.data;
  },

  async toggle(novelId) {
    const response = await api.post(`/bookmarks/${novelId}/toggle`);
    return response.data;
  },
};