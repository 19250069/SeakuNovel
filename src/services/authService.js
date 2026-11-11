import { api } from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(username, email, password, display_name) {
    const response = await api.post('/auth/register', { username, email, password, display_name });
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async changePassword(current_password, new_password) {
    const response = await api.put('/auth/change-password', { current_password, new_password });
    return response.data;
  },

  async becomeAuthor() {
    const response = await api.post('/auth/become-author');
    return response.data;
  },
};