import { api } from './api';

export const novelService = {
  async getAll(params = {}) {
    const response = await api.get('/novels', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/novels/${id}`);
    return response.data;
  },

  async getGenres() {
    const response = await api.get('/novels/genres');
    return response.data;
  },

  async getMyNovels(params = {}) {
    const response = await api.get('/novels/me', { params });
    return response.data;
  },

  async create(data, coverFile) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('slug', data.slug);
    formData.append('synopsis', data.synopsis);
    if (data.genre_ids) {
      data.genre_ids.forEach(id => formData.append('genre_ids[]', id));
    }
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const response = await api.post('/novels', formData);
    return response.data;
  },

  async update(id, data, coverFile) {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.slug) formData.append('slug', data.slug);
    if (data.synopsis !== undefined) formData.append('synopsis', data.synopsis);
    if (data.content !== undefined) formData.append('content', data.content);
    if (data.is_completed !== undefined) formData.append('is_completed', data.is_completed);
    if (data.genre_ids) {
      data.genre_ids.forEach(genreId => formData.append('genre_ids[]', genreId));
    }
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const response = await api.put(`/novels/${id}`, formData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/novels/${id}`);
    return response.data;
  },

  async publish(id) {
    const response = await api.put(`/novels/${id}/publish`);
    return response.data;
  },

  async unpublish(id) {
    const response = await api.put(`/novels/${id}/unpublish`);
    return response.data;
  },

  async getAnalytics(id) {
    const response = await api.get(`/novels/${id}/analytics`);
    return response.data;
  },
};
