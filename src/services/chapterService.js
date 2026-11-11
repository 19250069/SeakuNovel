import { api } from './api';

export const chapterService = {
  async getByNovel(novelId, params = {}) {
    const response = await api.get(`/chapters/novel/${novelId}`, { params });
    return response.data;
  },

  async getTrashed(novelId, params = {}) {
    const response = await api.get(`/chapters/trash/${novelId}`, { params });
    return response.data;
  },

  async restore(id) {
    const response = await api.post(`/chapters/${id}/restore`);
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/chapters/${id}`);
    return response.data;
  },

  async create(novelId, data) {
    const response = await api.post(`/chapters/create`, { ...data, novel_id: novelId });
    return response.data;
  },

  async update(id, data, config = {}) {
    const response = await api.put(`/chapters/${id}`, data, config);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/chapters/${id}`);
    return response.data;
  },

  async reorder(novelId, orders) {
    const response = await api.put(`/chapters/reorder/${novelId}`, { orders });
    return response.data;
  },

  async publish(id) {
    const response = await api.post(`/chapters/${id}/publish`);
    return response.data;
  },

  async unpublish(id) {
    const response = await api.post(`/chapters/${id}/unpublish`);
    return response.data;
  },

  async schedule(id, publish_at) {
    const response = await api.post(`/chapters/${id}/schedule`, { publish_at });
    return response.data;
  },

  async getComments(id) {
    const response = await api.get(`/chapters/${id}/comments`);
    return response.data;
  },

  async addComment(id, paragraph_index, content) {
    const response = await api.post(`/chapters/${id}/comments`, { paragraph_index, content });
    return response.data;
  },

  async recordView(id) {
    const response = await api.post(`/chapters/${id}/view`);
    return response.data;
  }
};
