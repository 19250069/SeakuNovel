import { api } from './api';

export const reviewService = {
  async getAll(params = {}) {
    const response = await api.get('/reviews', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },

  async getByNovel(novelId, params = {}) {
    const response = await api.get(`/reviews/novel/${novelId}`, { params });
    return response.data;
  },

  async create(data) {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },

  async like(id) {
    const response = await api.post(`/reviews/${id}/like`);
    return response.data;
  },
};