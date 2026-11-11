import api from './api';

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  updateUserRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getNovels: async (params = {}) => {
    const response = await api.get('/admin/novels', { params });
    return response.data;
  },

  updateNovelStatus: async (id, status) => {
    const response = await api.put(`/admin/novels/${id}/status`, { status });
    return response.data;
  },

  deleteNovel: async (id) => {
    const response = await api.delete(`/admin/novels/${id}`);
    return response.data;
  },

  getReports: async (params = {}) => {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  updateReportStatus: async (id, status) => {
    const response = await api.put(`/admin/reports/${id}`, { status });
    return response.data;
  },

  deleteReport: async (id) => {
    const response = await api.delete(`/admin/reports/${id}`);
    return response.data;
  },
};

export default adminService;
