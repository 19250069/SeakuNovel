import { api } from './api';

export const followService = {
  async toggle(targetType, targetId) {
    const response = await api.post('/follows/toggle', {
      target_type: targetType,
      target_id: targetId,
    });
    return response.data;
  },

  async checkStatus(targetType, targetId) {
    const response = await api.get('/follows/status', {
      params: { target_type: targetType, target_id: targetId },
    });
    return response.data;
  },

  async getMyFollows(targetType = null) {
    const response = await api.get('/follows/my', {
      params: targetType ? { target_type: targetType } : {},
    });
    return response.data;
  },
};

export default followService;
