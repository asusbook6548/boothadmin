import axios from 'axios';
import { getErrorMessage } from '../utils/error';

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
// RESPONSE INTERCEPTOR — handle errors globally & normalize messages
// ============================================================

client.interceptors.response.use(
  (response) => {
    console.log(
      `[Frontend API Response Success] ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]:`,
      response.data
    );
    return response;
  },
  (error) => {
    console.log(
      `[Frontend API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} [${error.response?.status}]:`,
      error.response?.data || error.message
    );
    // Normalize error message from backend
    const properMessage = getErrorMessage(error);
    if (error && typeof error === 'object') {
      error.message = properMessage;
    }

    if (error.response) {
      const status = error.response.status;
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (status === 401 && !isLoginRequest) {
        // Clear auth and redirect to login
        clearToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
