import axios from 'axios';
import { clearToken, getToken } from './auth';

// Axios instance pointed at the API. NEXT_PUBLIC_API_URL comes from .env.local
// (falls back to localhost for local dev).
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});

// 1 + 2: attach the JWT from localStorage to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3: on 401, drop the stale token and bounce to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
