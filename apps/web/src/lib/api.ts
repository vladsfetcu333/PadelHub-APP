import axios from 'axios';

const baseURL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach auth token when available (Phase 1)
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor — global error handling (Phase 1)
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
