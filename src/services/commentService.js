import { api } from './api';

export const commentService = {
  async getByReview(reviewId, params = {}) {
    const response = await api.get(`/comments/review/${reviewId}`, { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/comments/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await api.post('/comments', data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/comments/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },
};