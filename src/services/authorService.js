import { api } from './api';

export const authorService = {
  async getDashboard() {
    const response = await api.get('/author/dashboard');
    return response.data;
  },
};

export default authorService;
