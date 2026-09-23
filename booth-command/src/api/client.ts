import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const TOKEN_KEY = 'bc_access_token';

// ============================================================
// TOKEN HELPERS
// ============================================================

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// ============================================================
// AXIOS INSTANCE
// ============================================================

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR — attach JWT
// ============================================================

client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR — handle errors globally
// ============================================================

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        // Clear auth and redirect to login
        clearToken();
        window.location.href = '/login';
      }
      // 403, 404, 400, 422, 500 handled per-component using error.response.data
    }
    return Promise.reject(error);
  }
);

export default client;
