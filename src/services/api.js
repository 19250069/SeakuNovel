import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const USE_COOKIE = import.meta.env.VITE_USE_COOKIE_AUTH === 'true'; // Corrected variable name

export const api = axios.create({
  baseURL: API_URL,
  // Do not set a global Content-Type header so axios can
  // automatically set the correct headers for FormData requests.
  withCredentials: USE_COOKIE,
});

// Attach Authorization header only when not using cookie-based auth.
api.interceptors.request.use(
  (config) => {
    if (!USE_COOKIE) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;