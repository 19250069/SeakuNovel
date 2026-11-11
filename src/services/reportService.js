import { api } from './api';

export const reportService = {
  async create(payload) {
    const response = await api.post('/reports', payload);
    return response.data;
  },

  async list(params = {}) {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  async forTarget(targetType, targetId) {
    const response = await api.get(`/reports/${targetType}/${targetId}`);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },
};
